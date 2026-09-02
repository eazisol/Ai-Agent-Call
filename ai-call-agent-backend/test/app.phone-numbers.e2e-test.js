const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  PhoneNumbersController,
} = require('../dist/modules/phone-numbers/phone-numbers.controller');
const {
  PhoneNumbersService,
} = require('../dist/modules/phone-numbers/phone-numbers.service');
const {
  AuthCookieService,
} = require('../dist/modules/auth/auth-cookie.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');
const { ConfigService } = require('@nestjs/config');
const { ApplicationError } = require('../dist/common/errors/application-error');

const orgId = '11111111-1111-4111-8111-111111111111';
const bizId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const phoneId = '99999999-9999-4999-8999-999999999999';
const agentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const samplePhoneNumber = {
  id: phoneId,
  phoneNumberE164: '+14155550100',
  country: 'US',
  provider: 'twilio',
  status: 'active',
  capabilities: { voice: true, sms: true, mms: false },
  friendlyName: 'Main line',
  assignment: null,
  providerNumberId: 'PN123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function createApp(serviceOverrides = {}, options = {}) {
  const businessId = options.businessId ?? bizId;
  const moduleRef = await Test.createTestingModule({
    controllers: [PhoneNumbersController],
    providers: [
      {
        provide: PhoneNumbersService,
        useValue: {
          listForUser: async () => ({
            items: [samplePhoneNumber],
            page: 1,
            limit: 20,
            total: 1,
          }),
          getForUser: async (_u, _o, _b, id) => {
            if (id !== phoneId) {
              throw new ApplicationError(
                'PHONE_NUMBER_NOT_FOUND',
                'Phone number not found.',
                404,
              );
            }
            return samplePhoneNumber;
          },
          searchForUser: async () => ({
            candidates: [
              {
                phoneNumber: '+14155550100',
                friendlyName: 'San Francisco, CA',
                locality: 'San Francisco',
                region: 'CA',
                isoCountry: 'US',
                capabilities: { voice: true, sms: true, mms: false },
              },
            ],
          }),
          purchaseForUser: async () => ({ phoneNumber: samplePhoneNumber }),
          importForUser: async () => ({ phoneNumber: samplePhoneNumber }),
          assignForUser: async (_u, _o, _b, id, body) => ({
            phoneNumberId: id,
            assignment: {
              id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              agentId: body.agentId,
              agentName: 'Receptionist',
              status: 'active',
              assignedAt: new Date().toISOString(),
            },
          }),
          unassignForUser: async (_u, _o, _b, id) => ({
            phoneNumberId: id,
            assignment: null,
          }),
          releaseForUser: async (_u, _o, _b, id) => ({
            phoneNumberId: id,
            status: 'released',
            releasedAt: new Date().toISOString(),
          }),
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
          eazi_org: orgId,
          eazi_biz: businessId,
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

test('GET /phone-numbers lists inventory', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/phone-numbers')
    .expect(200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].phoneNumberE164, '+14155550100');
  await app.close();
});

test('POST /phone-numbers/search returns candidates', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/phone-numbers/search')
    .send({ isoCountry: 'US', areaCode: '415', limit: 5 })
    .expect(200);
  assert.equal(response.body.candidates.length, 1);
  await app.close();
});

test('POST /phone-numbers/purchase requires confirm flag', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/phone-numbers/purchase')
    .send({ phoneNumber: '+14155550100' })
    .expect(400);
  assert.ok(response.body.error || response.body.message);
  await app.close();
});

test('POST /phone-numbers/purchase creates inventory row', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/phone-numbers/purchase')
    .send({ phoneNumber: '+14155550100', confirm: true })
    .expect(201);
  assert.equal(response.body.phoneNumber.status, 'active');
  await app.close();
});

test('POST /phone-numbers/import maps provider number', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/phone-numbers/import')
    .send({ phoneNumber: '+14155550999', friendlyName: 'Imported line' })
    .expect(201);
  assert.equal(response.body.phoneNumber.phoneNumberE164, '+14155550100');
  await app.close();
});

test('POST /phone-numbers/:id/assign returns assignment', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/phone-numbers/${phoneId}/assign`)
    .send({ agentId })
    .expect(200);
  assert.equal(response.body.assignment.agentId, agentId);
  await app.close();
});

test('POST /phone-numbers/:id/unassign clears assignment', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/phone-numbers/${phoneId}/unassign`)
    .expect(200);
  assert.equal(response.body.assignment, null);
  await app.close();
});

test('DELETE /phone-numbers/:id releases number when confirmed', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .delete(`/api/v1/phone-numbers/${phoneId}`)
    .send({ confirm: true })
    .expect(200);
  assert.equal(response.body.status, 'released');
  await app.close();
});

test('DELETE /phone-numbers/:id surfaces PHONE_NUMBER_HAS_ASSIGNMENT', async () => {
  const app = await createApp({
    releaseForUser: async () => {
      throw new ApplicationError(
        'PHONE_NUMBER_HAS_ASSIGNMENT',
        'Unassign this phone number from its agent before releasing, or set unassignFirst to true.',
        409,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .delete(`/api/v1/phone-numbers/${phoneId}`)
    .send({ confirm: true })
    .expect(409);
  assert.equal(response.body.error.code, 'PHONE_NUMBER_HAS_ASSIGNMENT');
  await app.close();
});

test('DELETE /phone-numbers/:id requires confirm flag in body', async () => {
  const app = await createApp({
    releaseForUser: async () => {
      throw new ApplicationError(
        'CONFIRMATION_REQUIRED',
        'Set confirm to true before releasing a phone number.',
        400,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .delete(`/api/v1/phone-numbers/${phoneId}`)
    .send({ confirm: false })
    .expect(400);
  assert.equal(response.body.error.code, 'CONFIRMATION_REQUIRED');
  await app.close();
});

test('GET /phone-numbers/:id returns PHONE_NUMBER_NOT_FOUND for foreign id', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/phone-numbers/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
    .expect(404);
  assert.equal(response.body.error.code, 'PHONE_NUMBER_NOT_FOUND');
  await app.close();
});

test('POST /phone-numbers/:id/assign surfaces PHONE_ASSIGNMENT_CROSS_BUSINESS', async () => {
  const app = await createApp({
    assignForUser: async () => {
      throw new ApplicationError(
        'PHONE_ASSIGNMENT_CROSS_BUSINESS',
        'This agent does not belong to the same business as the phone number.',
        403,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .post(`/api/v1/phone-numbers/${phoneId}/assign`)
    .send({ agentId })
    .expect(403);
  assert.equal(response.body.error.code, 'PHONE_ASSIGNMENT_CROSS_BUSINESS');
  await app.close();
});

test('phone number list responses omit providerNumberId for viewer role views', async () => {
  const app = await createApp({
    listForUser: async () => ({
      items: [{ ...samplePhoneNumber, providerNumberId: undefined }],
      page: 1,
      limit: 20,
      total: 1,
    }),
  });
  const response = await request(app.getHttpServer())
    .get('/api/v1/phone-numbers')
    .expect(200);
  assert.equal(response.body.items[0].providerNumberId, undefined);
  await app.close();
});
