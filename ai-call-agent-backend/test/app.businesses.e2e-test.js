const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  BusinessesController,
} = require('../dist/modules/businesses/businesses.controller');
const {
  BusinessesService,
} = require('../dist/modules/businesses/businesses.service');
const {
  AuthCookieService,
} = require('../dist/modules/auth/auth-cookie.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');
const { ConfigService } = require('@nestjs/config');
const {
  ApplicationError,
} = require('../dist/common/errors/application-error');

const sampleBusiness = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  organizationId: '11111111-1111-4111-8111-111111111111',
  name: 'Bella Restaurant',
  industry: 'restaurant',
  industryLabel: null,
  website: null,
  email: 'hello@bella.example',
  phone: null,
  timezone: 'America/New_York',
  defaultLanguage: 'en',
  languages: ['en'],
  languageDetectionEnabled: false,
  languageSwitchingEnabled: false,
  status: 'active',
  settings: {
    addressLine1: null,
    addressLine2: null,
    city: 'New York',
    region: null,
    postalCode: null,
    country: 'US',
  },
  hours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: true,
    opensAt: null,
    closesAt: null,
  })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function createApp(serviceOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [BusinessesController],
    providers: [
      {
        provide: BusinessesService,
        useValue: {
          create: async () => sampleBusiness,
          listForUser: async () => [sampleBusiness],
          getForUser: async (_u, _o, id) => {
            if (id !== sampleBusiness.id) {
              throw new ApplicationError(
                'BUSINESS_NOT_FOUND',
                'Business not found.',
                404,
              );
            }
            return sampleBusiness;
          },
          updateForUser: async () => ({
            ...sampleBusiness,
            name: 'Bella Updated',
          }),
          archiveForUser: async () => ({
            ...sampleBusiness,
            status: 'archived',
          }),
          deleteForUser: async () => ({ deleted: true }),
          resolveActiveForUser: async (_u, _o, id) => {
            if (id !== sampleBusiness.id) {
              throw new ApplicationError(
                'BUSINESS_NOT_FOUND',
                'Business not found.',
                404,
              );
            }
            return sampleBusiness;
          },
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
              'auth.bizCookieName': 'eazi_biz',
              'auth.refreshTtlSeconds': 2592000,
              'auth.cookieSecure': false,
              'auth.cookieSameSite': 'lax',
              'app.nodeEnv': 'test',
            };
            return values[key];
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
        request.cookies = {
          eazi_org: sampleBusiness.organizationId,
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

test('POST /businesses creates and sets eazi_biz cookie', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/businesses')
    .send({
      name: 'Bella Restaurant',
      industry: 'restaurant',
      email: 'hello@bella.example',
      timezone: 'America/New_York',
      defaultLanguage: 'en',
    })
    .expect(201);

  assert.equal(response.body.business.name, 'Bella Restaurant');
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) => value.startsWith('eazi_biz=')),
    true,
  );
  await app.close();
});

test('GET /businesses lists org businesses', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/businesses')
    .expect(200);
  assert.equal(response.body.businesses.length, 1);
  await app.close();
});

test('GET /businesses/:id returns 404 for unknown business', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/businesses/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    .expect(404);
  assert.equal(response.body.error.code, 'BUSINESS_NOT_FOUND');
  await app.close();
});

test('PATCH /businesses/:id updates business', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .patch(`/api/v1/businesses/${sampleBusiness.id}`)
    .send({ name: 'Bella Updated' })
    .expect(200);
  assert.equal(response.body.business.name, 'Bella Updated');
  await app.close();
});

test('POST /businesses/active sets cookie after ownership check', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/businesses/active')
    .send({ businessId: sampleBusiness.id })
    .expect(200);
  assert.equal(response.body.business.id, sampleBusiness.id);
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) =>
      value.startsWith(`eazi_biz=${sampleBusiness.id}`),
    ),
    true,
  );
  await app.close();
});

test('POST /businesses/:id/archive archives business', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/businesses/${sampleBusiness.id}/archive`)
    .expect(200);
  assert.equal(response.body.business.status, 'archived');
  await app.close();
});

test('DELETE returns BUSINESS_HAS_DEPENDENTS when service denies', async () => {
  const app = await createApp({
    deleteForUser: async () => {
      throw new ApplicationError(
        'BUSINESS_HAS_DEPENDENTS',
        'This business has related records. Archive it instead of deleting.',
        409,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .delete(`/api/v1/businesses/${sampleBusiness.id}`)
    .expect(409);
  assert.equal(response.body.error.code, 'BUSINESS_HAS_DEPENDENTS');
  await app.close();
});

test('create rejects invalid industry with VALIDATION_ERROR', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/businesses')
    .send({
      name: 'X',
      industry: 'spaceship',
      email: 'x@example.com',
      timezone: 'UTC',
      defaultLanguage: 'en',
    })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});

test('missing active organization cookie returns ACTIVE_ORGANIZATION_REQUIRED', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [BusinessesController],
    providers: [
      {
        provide: BusinessesService,
        useValue: {
          listForUser: async () => {
            throw new Error('should not be called');
          },
        },
      },
      AuthCookieService,
      {
        provide: ConfigService,
        useValue: {
          get: (key) => {
            const values = {
              'auth.orgCookieName': 'eazi_org',
              'auth.bizCookieName': 'eazi_biz',
              'auth.refreshTtlSeconds': 2592000,
              'auth.cookieSecure': false,
              'auth.cookieSameSite': 'lax',
              'app.nodeEnv': 'test',
            };
            return values[key];
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
        };
        request.cookies = {};
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const response = await request(app.getHttpServer())
    .get('/api/v1/businesses')
    .expect(400);
  assert.equal(response.body.error.code, 'ACTIVE_ORGANIZATION_REQUIRED');
  await app.close();
});

test('RBAC and cross-tenant denials surface FORBIDDEN / BUSINESS_NOT_FOUND', async () => {
  const app = await createApp({
    create: async () => {
      throw new ApplicationError(
        'FORBIDDEN',
        'You do not have permission to perform this action.',
        403,
      );
    },
    getForUser: async () => {
      throw new ApplicationError(
        'BUSINESS_NOT_FOUND',
        'Business not found.',
        404,
      );
    },
    archiveForUser: async () => {
      throw new ApplicationError(
        'FORBIDDEN',
        'You do not have permission to perform this action.',
        403,
      );
    },
  });

  const forbidden = await request(app.getHttpServer())
    .post('/api/v1/businesses')
    .send({
      name: 'Nope',
      industry: 'restaurant',
      email: 'x@example.com',
      timezone: 'UTC',
      defaultLanguage: 'en',
    })
    .expect(403);
  assert.equal(forbidden.body.error.code, 'FORBIDDEN');

  const missing = await request(app.getHttpServer())
    .get(`/api/v1/businesses/${sampleBusiness.id}`)
    .expect(404);
  assert.equal(missing.body.error.code, 'BUSINESS_NOT_FOUND');

  const archiveDenied = await request(app.getHttpServer())
    .post(`/api/v1/businesses/${sampleBusiness.id}/archive`)
    .expect(403);
  assert.equal(archiveDenied.body.error.code, 'FORBIDDEN');
  await app.close();
});

test('invalid hours payload returns VALIDATION_ERROR', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/businesses')
    .send({
      name: 'Hours Bad',
      industry: 'restaurant',
      email: 'hours@example.com',
      timezone: 'UTC',
      defaultLanguage: 'en',
      hours: [
        {
          dayOfWeek: 9,
          isClosed: false,
          opensAt: '09:00',
          closesAt: '17:00',
        },
      ],
    })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});
