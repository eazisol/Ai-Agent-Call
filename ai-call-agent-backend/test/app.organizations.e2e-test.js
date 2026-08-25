const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  OrganizationsController,
} = require('../dist/modules/organizations/organizations.controller');
const {
  OrganizationsService,
} = require('../dist/modules/organizations/organizations.service');
const {
  AuthCookieService,
} = require('../dist/modules/auth/auth-cookie.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');
const { ConfigService } = require('@nestjs/config');

const sampleOrg = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Acme',
  slug: 'acme',
  role: 'owner',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function createApp(serviceOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [OrganizationsController],
    providers: [
      {
        provide: OrganizationsService,
        useValue: {
          create: async () => sampleOrg,
          listForUser: async () => [sampleOrg],
          getForUser: async (_userId, id) => {
            if (id !== sampleOrg.id) {
              const { ApplicationError } = require('../dist/common/errors/application-error');
              throw new ApplicationError(
                'ORGANIZATION_NOT_FOUND',
                'Organization not found.',
                404,
              );
            }
            return sampleOrg;
          },
          updateForOwner: async () => ({ ...sampleOrg, name: 'Acme Updated' }),
          ...serviceOverrides,
        },
      },
      AuthCookieService,
      {
        provide: ConfigService,
        useValue: {
          get: (key) => {
            const values = {
              'auth.orgCookieName': 'eazi_org',
              'auth.refreshTtlSeconds': 2592000,
              'auth.cookieSecure': false,
              'auth.cookieSameSite': 'lax',
              'app.nodeEnv': 'test',
            };
            return values[key];
          },
        },
      },
      {
        provide: AuthGuard,
        useValue: {
          canActivate: (context) => {
            const request = context.switchToHttp().getRequest();
            request.authUser = {
              id: '22222222-2222-4222-8222-222222222222',
              email: 'user@example.com',
              displayName: 'User',
              emailVerifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            return true;
          },
        },
      },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest();
        request.authUser = {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'user@example.com',
          displayName: 'User',
          emailVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  return app;
}

test('POST /organizations creates and sets active org cookie', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations')
    .send({ name: 'Acme' })
    .expect(201);

  assert.equal(response.body.organization.slug, 'acme');
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) => value.startsWith('eazi_org=')),
    true,
  );
  await app.close();
});

test('GET /organizations lists membership-scoped organizations', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/organizations')
    .expect(200);
  assert.equal(response.body.organizations.length, 1);
  await app.close();
});

test('GET /organizations/:id returns 404 for unknown org', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/organizations/33333333-3333-4333-8333-333333333333')
    .expect(404);
  assert.equal(response.body.error.code, 'ORGANIZATION_NOT_FOUND');
  await app.close();
});

test('PATCH /organizations/:id updates settings', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .patch(`/api/v1/organizations/${sampleOrg.id}`)
    .send({ name: 'Acme Updated' })
    .expect(200);
  assert.equal(response.body.organization.name, 'Acme Updated');
  await app.close();
});

test('POST /organizations/active sets cookie after membership check', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations/active')
    .send({ organizationId: sampleOrg.id })
    .expect(200);
  assert.equal(response.body.organization.id, sampleOrg.id);
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) => value.startsWith(`eazi_org=${sampleOrg.id}`)),
    true,
  );
  await app.close();
});

test('create organization rejects empty name with VALIDATION_ERROR', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations')
    .send({ name: '' })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});
