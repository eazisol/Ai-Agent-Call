const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  TelephonyController,
} = require('../dist/modules/twilio/telephony.controller');
const {
  TelephonyStatusService,
} = require('../dist/modules/twilio/telephony-status.service');
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
const { ConfigService } = require('@nestjs/config');

const orgId = '11111111-1111-4111-8111-111111111111';

const sampleStatus = {
  provider: 'twilio',
  configured: true,
  credentialsValid: true,
  credentialsMessage: null,
  webhookSignatureValidation: true,
  webhookUrls: {
    incomingCall: 'https://api.example.com/api/v1/webhooks/twilio/incoming-call',
    statusCallback:
      'https://api.example.com/api/v1/webhooks/twilio/status-callback',
  },
  activePhoneNumbers: 2,
};

async function createApp(role = 'owner', cookieOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [TelephonyController],
    providers: [
      {
        provide: TelephonyStatusService,
        useValue: {
          getProviderStatus: async () => sampleStatus,
        },
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

test('GET /telephony/provider-status returns status for owner', async () => {
  const app = await createApp('owner');
  const response = await request(app.getHttpServer())
    .get('/api/v1/telephony/provider-status')
    .expect(200);

  assert.deepEqual(response.body.status, sampleStatus);
  await app.close();
});

test('GET /telephony/provider-status returns FORBIDDEN for viewer', async () => {
  const app = await createApp('viewer');
  const response = await request(app.getHttpServer())
    .get('/api/v1/telephony/provider-status')
    .expect(403);

  assert.equal(response.body.error.code, 'FORBIDDEN');
  await app.close();
});

test('GET /telephony/provider-status requires active organization cookie', async () => {
  const app = await createApp('owner', { eazi_org: undefined });
  const response = await request(app.getHttpServer())
    .get('/api/v1/telephony/provider-status')
    .expect(400);

  assert.equal(response.body.error.code, 'ACTIVE_ORGANIZATION_REQUIRED');
  await app.close();
});

test('GET /telephony/provider-status never exposes auth token or API secrets', async () => {
  const app = await createApp('owner');
  const response = await request(app.getHttpServer())
    .get('/api/v1/telephony/provider-status')
    .expect(200);

  const serialized = JSON.stringify(response.body).toLowerCase();
  for (const secret of [
    'auth_token',
    'authtoken',
    'api_key_secret',
    'twilio_api_key',
    'sk',
  ]) {
    assert.equal(
      serialized.includes(secret),
      false,
      `response must not include ${secret}`,
    );
  }
  assert.equal(typeof response.body.status.configured, 'boolean');
  assert.equal(typeof response.body.status.credentialsValid, 'boolean');
  await app.close();
});
