const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  KnowledgeController,
} = require('../dist/modules/knowledge/knowledge.controller');
const {
  AgentKnowledgeController,
} = require('../dist/modules/knowledge/agent-knowledge.controller');
const {
  KnowledgeService,
} = require('../dist/modules/knowledge/knowledge.service');
const {
  KnowledgeSyncService,
} = require('../dist/modules/knowledge/knowledge-sync.service');
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
const agentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const knowledgeId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const sampleSource = {
  id: knowledgeId,
  businessId: bizId,
  organizationId: orgId,
  name: 'Clinic Hours',
  type: 'text',
  status: 'active',
  description: null,
  language: null,
  url: null,
  textBody: 'Open 9-5',
  faqItems: null,
  originalFilename: null,
  contentType: 'text/plain',
  byteSize: 8,
  contentHash: 'abc',
  version: 1,
  assignedAgentCount: 0,
  providerMappings: [],
  needsSync: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function createApp(serviceOverrides = {}, syncOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [KnowledgeController, AgentKnowledgeController],
    providers: [
      {
        provide: KnowledgeService,
        useValue: {
          listForUser: async () => [sampleSource],
          getForUser: async (_u, _o, _b, id) => {
            if (id !== knowledgeId) {
              throw new ApplicationError(
                'KNOWLEDGE_NOT_FOUND',
                'Knowledge source not found.',
                404,
              );
            }
            return sampleSource;
          },
          createText: async () => sampleSource,
          createUrl: async () => ({ ...sampleSource, type: 'url' }),
          createFaq: async () => ({ ...sampleSource, type: 'faq' }),
          createFile: async () => {
            throw new ApplicationError(
              'OBJECT_STORAGE_NOT_CONFIGURED',
              'Object storage is not configured.',
              503,
            );
          },
          updateForUser: async () => ({
            ...sampleSource,
            name: 'Updated Hours',
          }),
          archiveForUser: async () => ({
            ...sampleSource,
            status: 'archived',
          }),
          deleteForUser: async () => {
            throw new ApplicationError(
              'KNOWLEDGE_HAS_ASSIGNMENTS',
              'Unassign this knowledge from all agents before deleting.',
              409,
            );
          },
          listAgentKnowledge: async () => [
            {
              assignmentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              agentId,
              knowledge: sampleSource,
              assignedAt: new Date().toISOString(),
            },
          ],
          assignToAgent: async (_u, _o, _b, aId, kId) => {
            if (aId !== agentId) {
              throw new ApplicationError(
                'AGENT_NOT_FOUND',
                'Agent not found.',
                404,
              );
            }
            return {
              assignmentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              agentId: aId,
              knowledge: { ...sampleSource, id: kId },
              assignedAt: new Date().toISOString(),
            };
          },
          unassignFromAgent: async () => ({ deleted: true }),
          ...serviceOverrides,
        },
      },
      {
        provide: KnowledgeSyncService,
        useValue: {
          syncForUser: async () => {
            throw new ApplicationError(
              'PROVIDER_NOT_CONFIGURED',
              'ElevenLabs is not configured on the server.',
              503,
            );
          },
          resyncForUser: async () => {
            throw new ApplicationError(
              'PROVIDER_NOT_CONFIGURED',
              'ElevenLabs is not configured on the server.',
              503,
            );
          },
          getStatusForUser: async () => ({
            provider: 'elevenlabs',
            syncStatus: 'not_provisioned',
            externalSourceId: null,
            lastSyncedAt: null,
            lastSyncedVersion: null,
            lastError: null,
            remote: {
              checked: false,
              exists: null,
              name: null,
              rawStatus: null,
            },
          }),
          ...syncOverrides,
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

test('POST /knowledge/text creates text source', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/knowledge/text')
    .send({ name: 'Clinic Hours', text: 'Open 9-5' })
    .expect(201);
  assert.equal(response.body.source.name, 'Clinic Hours');
  await app.close();
});

test('GET /knowledge lists sources', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/knowledge')
    .expect(200);
  assert.equal(response.body.sources.length, 1);
  await app.close();
});

test('DELETE /knowledge/:id returns KNOWLEDGE_HAS_ASSIGNMENTS', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .delete(`/api/v1/knowledge/${knowledgeId}`)
    .expect(409);
  assert.equal(response.body.error.code, 'KNOWLEDGE_HAS_ASSIGNMENTS');
  await app.close();
});

test('POST /knowledge/:id/sync returns PROVIDER_NOT_CONFIGURED', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/knowledge/${knowledgeId}/sync`)
    .expect(503);
  assert.equal(response.body.error.code, 'PROVIDER_NOT_CONFIGURED');
  await app.close();
});

test('POST /agents/:agentId/knowledge/:knowledgeId assigns', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/agents/${agentId}/knowledge/${knowledgeId}`)
    .expect(201);
  assert.equal(response.body.assignment.agentId, agentId);
  await app.close();
});

test('GET /agents/:agentId/knowledge lists assignments', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get(`/api/v1/agents/${agentId}/knowledge`)
    .expect(200);
  assert.equal(response.body.assignments.length, 1);
  await app.close();
});

test('cross-business assign surfaces KNOWLEDGE_CROSS_BUSINESS', async () => {
  const app = await createApp({
    assignToAgent: async () => {
      throw new ApplicationError(
        'KNOWLEDGE_CROSS_BUSINESS',
        'Knowledge can only be assigned to agents in the same business.',
        403,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .post(
      `/api/v1/agents/${agentId}/knowledge/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee`,
    )
    .expect(403);
  assert.equal(response.body.error.code, 'KNOWLEDGE_CROSS_BUSINESS');
  await app.close();
});
