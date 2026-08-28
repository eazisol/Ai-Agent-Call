const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const { VoiceClonesController } = require('../dist/modules/voice-clones/voice-clones.controller');
const {
  VoiceClonesService,
} = require('../dist/modules/voice-clones/voice-clones.service');
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
const cloneId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const sampleClone = {
  id: cloneId,
  displayName: 'Owner Clone',
  description: null,
  status: 'draft',
  voiceAssetId: null,
  sampleCount: 0,
  assignedAgentCount: 0,
  lastError: null,
  createdAt: new Date().toISOString(),
  readyAt: null,
  provider: 'elevenlabs',
  submittedAt: null,
  revokedAt: null,
  consentRecorded: false,
  consentAcceptedAt: null,
  samples: [],
  assignedAgents: [],
};

async function createApp(serviceOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [VoiceClonesController],
    providers: [
      {
        provide: VoiceClonesService,
        useValue: {
          listForUser: async () => ({
            clones: [sampleClone],
            total: 1,
            page: 1,
            limit: 20,
          }),
          createDraftForUser: async () => sampleClone,
          getForUser: async (_u, _o, _b, id) => {
            if (id !== cloneId) {
              throw new ApplicationError(
                'VOICE_CLONE_NOT_FOUND',
                'Voice clone was not found.',
                404,
              );
            }
            return sampleClone;
          },
          getStatusForUser: async () => ({
            status: 'draft',
            lastError: null,
            voiceAssetId: null,
          }),
          recordConsentForUser: async () => ({
            consent: { id: 'consent-1', acceptedAt: new Date() },
          }),
          submitForUser: async () => ({
            ...sampleClone,
            status: 'ready',
            voiceAssetId: 'voice-asset-1',
          }),
          deleteForUser: async () => {},
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
        const req = context.switchToHttp().getRequest();
        req.authUser = { id: 'user-1' };
        req.cookies = {
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

test('GET /voices/clones lists clones', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/voices/clones')
    .expect(200);
  assert.equal(response.body.clones.length, 1);
  assert.equal(response.body.clones[0].displayName, 'Owner Clone');
  await app.close();
});

test('POST /voices/clones creates draft', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/voices/clones')
    .send({ displayName: 'Owner Clone' })
    .expect(201);
  assert.equal(response.body.clone.status, 'draft');
  await app.close();
});

test('POST /voices/clones/:id/consent records consent', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/voices/clones/${cloneId}/consent`)
    .send({
      consentVersion: 'm09-v1',
      consentTextHash: 'c'.repeat(64),
    })
    .expect(201);
  assert.ok(response.body.consent.id);
  await app.close();
});

test('DELETE /voices/clones/:id blocked when in use', async () => {
  const app = await createApp({
    deleteForUser: async () => {
      throw new ApplicationError(
        'VOICE_CLONE_IN_USE',
        'Unassign this voice from all agents before deleting the clone.',
        409,
        { assignedAgents: [{ id: 'agent-1', name: 'Front Desk' }] },
      );
    },
  });
  const response = await request(app.getHttpServer())
    .delete(`/api/v1/voices/clones/${cloneId}`)
    .expect(409);
  assert.equal(response.body.error.code, 'VOICE_CLONE_IN_USE');
  assert.ok(response.body.error.details.assignedAgents);
  await app.close();
});

test('GET /voices/clones response excludes secrets and sample storage paths', async () => {
  const app = await createApp({
    listForUser: async () => ({
      clones: [
        {
          ...sampleClone,
          status: 'ready',
          voiceAssetId: 'voice-asset-1',
          samples: [
            {
              id: 'sample-1',
              originalFilename: 'recording.webm',
              byteSize: 1200,
              contentType: 'audio/webm',
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }),
  });
  const response = await request(app.getHttpServer())
    .get('/api/v1/voices/clones')
    .expect(200);
  const serialized = JSON.stringify(response.body);
  assert.ok(!serialized.includes('xi-api-key'));
  assert.ok(!serialized.includes('ELEVENLABS'));
  assert.ok(!serialized.includes('storageKey'));
  assert.ok(!serialized.includes('voice-samples/'));
  assert.equal(response.body.clones[0].externalVoiceId, undefined);
  await app.close();
});

test('GET /voices/clones/:id returns 404 for unknown clone', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/voices/clones/00000000-0000-4000-8000-000000000099')
    .expect(404);
  assert.equal(response.body.error.code, 'VOICE_CLONE_NOT_FOUND');
  await app.close();
});
