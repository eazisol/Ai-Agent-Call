const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const { CallsController } = require('../dist/modules/calls/calls.controller');
const {
  CallLifecycleService,
} = require('../dist/modules/calls/call-lifecycle.service');
const {
  AuthCookieService,
} = require('../dist/modules/auth/auth-cookie.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const {
  OrganizationsService,
} = require('../dist/modules/organizations/organizations.service');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');
const { ApplicationError } = require('../dist/common/errors/application-error');
const { ConfigService } = require('@nestjs/config');

const orgId = '11111111-1111-4111-8111-111111111111';
const bizId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherBizId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const callId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createLifecycleMock() {
  return {
    listForBusiness: async (businessId) => {
      if (businessId !== bizId) {
        return { items: [], page: 1, limit: 20, total: 0 };
      }
      return {
        items: [{ id: callId, status: 'completed', businessId: bizId }],
        page: 1,
        limit: 20,
        total: 1,
      };
    },
    getForBusiness: async (businessId, id, role) => {
      if (businessId !== bizId || id !== callId) {
        throw new ApplicationError('CALL_NOT_FOUND', 'Call not found.', 404);
      }
      const call = {
        id: callId,
        status: 'completed',
        businessId: bizId,
      };
      if (role === 'owner' || role === 'admin' || role === 'manager') {
        call.providerLinks = {
          twilioCallSid: 'CA123',
          elevenLabsConversationId: 'conv-123',
        };
      }
      return { call, events: [] };
    },
  };
}

async function createApp(role = 'owner', cookieOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [CallsController],
    providers: [
      {
        provide: CallLifecycleService,
        useValue: createLifecycleMock(),
      },
      {
        provide: OrganizationsService,
        useValue: {
          requireMembership: async () => ({ role }),
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
        const req = context.switchToHttp().getRequest();
        req.authUser = {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'admin@example.com',
          displayName: 'Admin',
          emailVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        req.cookies = {
          eazi_org: orgId,
          eazi_biz: bizId,
          ...cookieOverrides,
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

test('GET /calls returns tenant-scoped list', async () => {
  const app = await createApp('owner');
  const response = await request(app.getHttpServer())
    .get('/api/v1/calls')
    .expect(200);

  assert.equal(response.body.total, 1);
  await app.close();
});

test('GET /calls requires active business cookie', async () => {
  const app = await createApp('owner', { eazi_biz: undefined });
  const response = await request(app.getHttpServer())
    .get('/api/v1/calls')
    .expect(400);

  assert.equal(response.body.error.code, 'ACTIVE_BUSINESS_REQUIRED');
  await app.close();
});

test('GET /calls/:id returns call detail', async () => {
  const app = await createApp('viewer');
  const response = await request(app.getHttpServer())
    .get(`/api/v1/calls/${callId}`)
    .expect(200);

  assert.equal(response.body.call.id, callId);
  assert.equal(response.body.call.providerLinks, undefined);
  await app.close();
});

test('GET /calls/:id returns provider links for owner role', async () => {
  const app = await createApp('owner');
  const response = await request(app.getHttpServer())
    .get(`/api/v1/calls/${callId}`)
    .expect(200);

  assert.equal(response.body.call.providerLinks.twilioCallSid, 'CA123');
  assert.equal(
    response.body.call.providerLinks.elevenLabsConversationId,
    'conv-123',
  );
  await app.close();
});

test('GET /calls/:id returns CALL_NOT_FOUND for cross-business access', async () => {
  const app = await createApp('owner', { eazi_biz: otherBizId });
  const response = await request(app.getHttpServer())
    .get(`/api/v1/calls/${callId}`)
    .expect(404);

  assert.equal(response.body.error.code, 'CALL_NOT_FOUND');
  await app.close();
});
