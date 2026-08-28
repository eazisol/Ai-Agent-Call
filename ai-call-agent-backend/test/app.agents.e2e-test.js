const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  AgentsController,
} = require('../dist/modules/agents/agents.controller');
const { AgentsService } = require('../dist/modules/agents/agents.service');
const {
  AgentProviderSyncService,
} = require('../dist/modules/agents/agent-provider-sync.service');
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

const sampleAgent = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  businessId: bizId,
  organizationId: orgId,
  name: 'Front Desk',
  status: 'active',
  roleLabel: 'Receptionist',
  personality: null,
  greeting: 'Thanks for calling.',
  instructions: 'Answer FAQs.',
  language: 'en',
  languages: ['en'],
  languageDetectionEnabled: false,
  languageSwitchingEnabled: false,
  escalationEnabled: false,
  escalationKeywords: [],
  escalationContactPhone: null,
  escalationContactEmail: null,
  escalationMessage: null,
  providerMappings: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function createApp(serviceOverrides = {}, cookieOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [AgentsController],
    providers: [
      {
        provide: AgentsService,
        useValue: {
          create: async () => sampleAgent,
          listForUser: async () => [sampleAgent],
          getForUser: async (_u, _o, _b, id) => {
            if (id !== sampleAgent.id) {
              throw new ApplicationError(
                'AGENT_NOT_FOUND',
                'Agent not found.',
                404,
              );
            }
            return sampleAgent;
          },
          updateForUser: async () => ({
            ...sampleAgent,
            greeting: 'Updated greeting',
          }),
          activateForUser: async () => ({ ...sampleAgent, status: 'active' }),
          deactivateForUser: async () => ({
            ...sampleAgent,
            status: 'inactive',
          }),
          archiveForUser: async () => ({
            ...sampleAgent,
            status: 'archived',
          }),
          deleteForUser: async () => ({ deleted: true }),
          ...serviceOverrides,
        },
      },
      {
        provide: AgentProviderSyncService,
        useValue: {
          syncForUser: async () => ({
            agent: sampleAgent,
            sync: {
              provider: 'elevenlabs',
              syncStatus: 'synced',
              externalAgentId: 'el-agent-1',
              lastSyncedAt: new Date().toISOString(),
              lastError: null,
              warnings: [],
            },
          }),
          getStatusForUser: async () => ({
            provider: 'elevenlabs',
            syncStatus: 'synced',
            externalAgentId: 'el-agent-1',
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
            remote: {
              checked: true,
              exists: true,
              name: 'Front Desk',
              rawStatus: 'available',
            },
          }),
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

const createBody = {
  name: 'Front Desk',
  roleLabel: 'Receptionist',
  greeting: 'Thanks for calling.',
  instructions: 'Answer FAQs.',
  language: 'en',
};

test('POST /agents creates agent', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/agents')
    .send(createBody)
    .expect(201);
  assert.equal(response.body.agent.name, 'Front Desk');
  await app.close();
});

test('GET /agents lists agents', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/agents')
    .expect(200);
  assert.equal(response.body.agents.length, 1);
  await app.close();
});

test('GET /agents/:id returns 404 for unknown agent', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/agents/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    .expect(404);
  assert.equal(response.body.error.code, 'AGENT_NOT_FOUND');
  await app.close();
});

test('POST /agents/:id/activate and deactivate', async () => {
  const app = await createApp();
  await request(app.getHttpServer())
    .post(`/api/v1/agents/${sampleAgent.id}/activate`)
    .expect(200);
  const response = await request(app.getHttpServer())
    .post(`/api/v1/agents/${sampleAgent.id}/deactivate`)
    .expect(200);
  assert.equal(response.body.agent.status, 'inactive');
  await app.close();
});

test('PATCH /agents/:id updates behavior', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .patch(`/api/v1/agents/${sampleAgent.id}`)
    .send({ greeting: 'Updated greeting' })
    .expect(200);
  assert.equal(response.body.agent.greeting, 'Updated greeting');
  await app.close();
});

test('POST /agents without eazi_biz returns ACTIVE_BUSINESS_REQUIRED', async () => {
  const app = await createApp({}, { eazi_biz: undefined });
  // Override guard cookies without biz — recreate with empty biz
  await app.close();

  const moduleRef = await Test.createTestingModule({
    controllers: [AgentsController],
    providers: [
      {
        provide: AgentsService,
        useValue: { create: async () => sampleAgent },
      },
      {
        provide: AgentProviderSyncService,
        useValue: {
          syncForUser: async () => ({}),
          getStatusForUser: async () => ({}),
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
        request.cookies = { eazi_org: orgId };
        return true;
      },
    })
    .compile();

  const missingBizApp = moduleRef.createNestApplication();
  missingBizApp.setGlobalPrefix('api/v1');
  missingBizApp.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  missingBizApp.useGlobalFilters(new GlobalExceptionFilter());
  await missingBizApp.init();

  const response = await request(missingBizApp.getHttpServer())
    .post('/api/v1/agents')
    .send(createBody)
    .expect(400);
  assert.equal(response.body.error.code, 'ACTIVE_BUSINESS_REQUIRED');
  await missingBizApp.close();
});

test('POST /agents rejects invalid language via VALIDATION_ERROR', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/agents')
    .send({ ...createBody, language: 'xx' })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});

test('FORBIDDEN from service surfaces as 403', async () => {
  const app = await createApp({
    create: async () => {
      throw new ApplicationError(
        'FORBIDDEN',
        'You do not have permission to perform this action.',
        403,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .post('/api/v1/agents')
    .send(createBody)
    .expect(403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
  await app.close();
});

test('POST /agents/:id/sync returns sync summary', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/agents/${sampleAgent.id}/sync`)
    .expect(200);
  assert.equal(response.body.sync.provider, 'elevenlabs');
  assert.equal(response.body.sync.syncStatus, 'synced');
  assert.equal(response.body.sync.externalAgentId, 'el-agent-1');
  await app.close();
});

test('GET /agents/:id/provider-status returns status', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get(`/api/v1/agents/${sampleAgent.id}/provider-status`)
    .expect(200);
  assert.equal(response.body.status.provider, 'elevenlabs');
  assert.equal(response.body.status.remote.exists, true);
  await app.close();
});
