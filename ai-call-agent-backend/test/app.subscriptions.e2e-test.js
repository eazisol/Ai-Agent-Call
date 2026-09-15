const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  PublicPlansController,
  SubscriptionsController,
} = require('../dist/modules/subscriptions/subscriptions.controller');
const {
  PlansService,
} = require('../dist/modules/subscriptions/plans.service');
const {
  SubscriptionsService,
} = require('../dist/modules/subscriptions/subscriptions.service');
const {
  EntitlementsService,
} = require('../dist/modules/subscriptions/entitlements.service');
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
const {
  ApplicationError,
} = require('../dist/common/errors/application-error');
const {
  ENTITLEMENT_KEYS,
} = require('../dist/modules/subscriptions/entitlement-keys');

const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';

const publicPlan = {
  code: 'growth',
  name: 'Growth',
  description: 'Example',
  sortOrder: 1,
  isRecommended: true,
  trialEligible: true,
  trialDays: 14,
  price: { currency: 'USD', monthlyCents: null, annualCents: null },
  comparison: null,
  ctaLabel: null,
};

async function createApp(overrides = {}, cookieOrgId = orgA) {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicPlansController, SubscriptionsController],
    providers: [
      {
        provide: PlansService,
        useValue: {
          listPublicPlans: async () => [],
          listCustomerVisiblePlans: async (current) => [
            { ...publicPlan, currentPlanMatch: current === 'growth' },
          ],
          createPlan: async () => {
            throw new ApplicationError(
              'FORBIDDEN',
              'Plan mutation is not available to tenants.',
              403,
            );
          },
          ...overrides.plans,
        },
      },
      {
        provide: SubscriptionsService,
        useValue: {
          getOrEnsureForOrganization: async (organizationId) => {
            if (organizationId !== orgA) {
              throw new ApplicationError(
                'ORGANIZATION_NOT_FOUND',
                'Organization not found.',
                404,
              );
            }
            return {
              organizationId: orgA,
              plan: { code: 'legacy_production', name: 'Legacy Production' },
              status: 'active',
            };
          },
          getViewForOrganization: async (organizationId) => {
            if (organizationId !== orgA) {
              throw new ApplicationError(
                'ORGANIZATION_NOT_FOUND',
                'Organization not found.',
                404,
              );
            }
            return {
              organizationId: orgA,
              plan: { code: 'legacy_production', name: 'Legacy Production' },
              status: 'active',
              trial: { start: null, end: null },
              period: { start: null, end: null },
              cancelAtPeriodEnd: false,
              capabilities: { canUpgrade: false, canManageBilling: false },
            };
          },
          ...overrides.subscriptions,
        },
      },
      {
        provide: EntitlementsService,
        useValue: {
          getResolvedEntitlements: async (organizationId) => {
            if (organizationId !== orgA) {
              throw new ApplicationError(
                'ORGANIZATION_NOT_FOUND',
                'Organization not found.',
                404,
              );
            }
            return {
              organizationId: orgA,
              planCode: 'legacy_production',
              status: 'active',
              entitlements: {
                [ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED]: true,
              },
              features: {
                [ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED]: true,
                [ENTITLEMENT_KEYS.ANALYTICS_ENABLED]: false,
                [ENTITLEMENT_KEYS.AUTOMATIONS_ENABLED]: false,
              },
              limits: {
                [ENTITLEMENT_KEYS.AGENTS_MAX]: null,
                [ENTITLEMENT_KEYS.BUSINESSES_MAX]: null,
                [ENTITLEMENT_KEYS.PHONE_NUMBERS_MAX]: null,
                [ENTITLEMENT_KEYS.MINUTES_MONTHLY_INCLUDED]: null,
              },
            };
          },
          ...overrides.entitlements,
        },
      },
      {
        provide: OrganizationsService,
        useValue: {
          requireMembership: async (_userId, organizationId) => {
            if (organizationId !== orgA) {
              throw new ApplicationError(
                'ORGANIZATION_NOT_FOUND',
                'Organization not found.',
                404,
              );
            }
            return { role: 'owner', organization: { id: orgA } };
          },
          ...overrides.organizations,
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
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.authUser = {
          id: userId,
          email: 'owner@example.com',
          displayName: 'Owner',
          emailVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        req.cookies = cookieOrgId ? { eazi_org: cookieOrgId } : {};
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  return app;
}

test('GET /api/v1/public/plans returns empty commercial catalog without auth', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/public/plans')
    .expect(200);
  assert.deepEqual(response.body, { plans: [] });
  await app.close();
});

test('GET /api/v1/public/plans never includes legacy_production', async () => {
  const app = await createApp({
    plans: {
      listPublicPlans: async () => {
        return [];
      },
    },
  });
  const response = await request(app.getHttpServer())
    .get('/api/v1/public/plans')
    .expect(200);
  assert.ok(
    !response.body.plans.some((plan) => plan.code === 'legacy_production'),
  );
  await app.close();
});

test('GET /api/v1/plans returns authenticated catalog for active org', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/plans')
    .expect(200);
  assert.equal(response.body.plans.length, 1);
  assert.equal(response.body.plans[0].code, 'growth');
  assert.equal(response.body.plans[0].currentPlanMatch, false);
  await app.close();
});

test('GET /api/v1/subscription returns legacy subscription for org', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/subscription')
    .expect(200);
  assert.equal(response.body.organizationId, orgA);
  assert.equal(response.body.plan.code, 'legacy_production');
  assert.equal(response.body.capabilities.canManageBilling, false);
  await app.close();
});

test('GET /api/v1/subscription/entitlements returns resolved map', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/subscription/entitlements')
    .expect(200);
  assert.equal(response.body.planCode, 'legacy_production');
  assert.equal(
    response.body.features[ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED],
    true,
  );
  await app.close();
});

test('cross-tenant subscription read is blocked', async () => {
  const app = await createApp({}, orgB);
  const response = await request(app.getHttpServer())
    .get('/api/v1/subscription')
    .expect(404);
  assert.equal(response.body.error.code, 'ORGANIZATION_NOT_FOUND');
  await app.close();
});

test('subscription requires active organization cookie', async () => {
  const app = await createApp({}, null);
  const response = await request(app.getHttpServer())
    .get('/api/v1/subscription')
    .expect(400);
  assert.equal(response.body.error.code, 'ORGANIZATION_REQUIRED');
  await app.close();
});

test('PlansService mutation is not exposed as tenant HTTP route', async () => {
  const app = await createApp();
  await request(app.getHttpServer()).post('/api/v1/admin/plans').expect(404);
  await request(app.getHttpServer()).post('/api/v1/plans').expect(404);
  await request(app.getHttpServer()).put('/api/v1/plans/x').expect(404);
  await request(app.getHttpServer()).delete('/api/v1/plans/x').expect(404);
  await app.close();
});

test('unauthenticated subscription endpoints are rejected', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicPlansController, SubscriptionsController],
    providers: [
      {
        provide: PlansService,
        useValue: {
          listPublicPlans: async () => [publicPlan],
          listCustomerVisiblePlans: async () => [],
        },
      },
      {
        provide: SubscriptionsService,
        useValue: {
          getViewForOrganization: async () => {
            throw new Error('should not run');
          },
          getOrEnsureForOrganization: async () => {
            throw new Error('should not run');
          },
        },
      },
      {
        provide: EntitlementsService,
        useValue: {
          getResolvedEntitlements: async () => {
            throw new Error('should not run');
          },
        },
      },
      {
        provide: OrganizationsService,
        useValue: {
          requireMembership: async () => {
            throw new Error('should not run');
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
      canActivate: () => {
        throw new ApplicationError(
          'UNAUTHENTICATED',
          'Authentication required.',
          401,
        );
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const sub = await request(app.getHttpServer())
    .get('/api/v1/subscription')
    .expect(401);
  assert.equal(sub.body.error.code, 'UNAUTHENTICATED');

  const ent = await request(app.getHttpServer())
    .get('/api/v1/subscription/entitlements')
    .expect(401);
  assert.equal(ent.body.error.code, 'UNAUTHENTICATED');

  await request(app.getHttpServer()).get('/api/v1/public/plans').expect(200);
  await app.close();
});
