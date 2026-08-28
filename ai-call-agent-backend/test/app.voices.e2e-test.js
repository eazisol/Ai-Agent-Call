const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  VoicesController,
  AgentVoiceController,
} = require('../dist/modules/voices/voices.controller');
const {
  VoicesService,
} = require('../dist/modules/voices/voices.service');
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
const voiceId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const sampleVoice = {
  id: voiceId,
  displayName: 'Sarah',
  description: 'Warm receptionist',
  languageCodes: ['en'],
  genderPresentation: 'female',
  accent: 'American',
  styleLabels: ['warm'],
  sourceType: 'provider_catalog',
  businessOwned: false,
  previewSampleText: 'Hello',
  previewAudioUrl: 'https://storage.googleapis.com/eleven-public-prod/preview/sample.mp3',
};

const sampleAssignment = {
  agentId,
  voiceId,
  voice: sampleVoice,
  voicePreference: 'neutral',
  warnings: [],
};

async function createApp(serviceOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [VoicesController, AgentVoiceController],
    providers: [
      {
        provide: VoicesService,
        useValue: {
          listForUser: async () => ({
            voices: [sampleVoice],
            total: 1,
            page: 1,
            limit: 50,
          }),
          getForUser: async (_u, _o, _b, id) => {
            if (id !== voiceId) {
              throw new ApplicationError(
                'VOICE_NOT_FOUND',
                'Voice was not found.',
                404,
              );
            }
            return {
              ...sampleVoice,
              status: 'active',
              assignedAgentCount: 1,
              assignedAgents: [{ id: agentId, name: 'Front Desk' }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          },
          previewForUser: async () => ({
            contentType: 'audio/mpeg',
            audioBase64: Buffer.from('audio-bytes').toString('base64'),
          }),
          getAgentVoiceForUser: async () => sampleAssignment,
          assignAgentVoiceForUser: async (_u, _o, _b, aId, vId) => {
            if (aId !== agentId) {
              throw new ApplicationError(
                'AGENT_NOT_FOUND',
                'Agent was not found for the active business.',
                404,
              );
            }
            if (vId !== voiceId) {
              throw new ApplicationError(
                'VOICE_NOT_ELIGIBLE',
                'This voice is not available for the active business.',
                403,
              );
            }
            return sampleAssignment;
          },
          clearAgentVoiceForUser: async () => ({
            ...sampleAssignment,
            voiceId: null,
            voice: null,
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
        const req = context.switchToHttp().getRequest();
        req.authUser = {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'user@example.com',
          displayName: 'User',
          emailVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
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

test('GET /voices lists eligible voices', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/voices')
    .expect(200);
  assert.equal(response.body.voices.length, 1);
  assert.equal(response.body.voices[0].displayName, 'Sarah');
  assert.equal(response.body.voices[0].externalVoiceId, undefined);
  await app.close();
});

test('POST /voices/:id/preview returns audio without provider secrets', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/voices/${voiceId}/preview`)
    .send({ sampleText: 'Hello' })
    .expect(200);
  assert.ok(response.body.preview.audioBase64);
  assert.equal(response.body.preview.contentType, 'audio/mpeg');
  const serialized = JSON.stringify(response.body);
  assert.ok(!serialized.includes('xi-api-key'));
  assert.ok(!serialized.includes('ELEVENLABS'));
  assert.ok(!serialized.includes('externalVoiceId'));
  await app.close();
});

test('PUT /agents/:agentId/voice assigns voice', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .put(`/api/v1/agents/${agentId}/voice`)
    .send({ voiceId })
    .expect(200);
  assert.equal(response.body.assignment.voiceId, voiceId);
  assert.equal(response.body.assignment.voice.displayName, 'Sarah');
  await app.close();
});

test('GET /agents/:agentId/voice returns assignment', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get(`/api/v1/agents/${agentId}/voice`)
    .expect(200);
  assert.equal(response.body.assignment.voiceId, voiceId);
  await app.close();
});

test('cross-business voice assign surfaces VOICE_NOT_ELIGIBLE', async () => {
  const app = await createApp({
    assignAgentVoiceForUser: async () => {
      throw new ApplicationError(
        'VOICE_NOT_ELIGIBLE',
        'This voice is not available for the active business.',
        403,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .put(`/api/v1/agents/${agentId}/voice`)
    .send({ voiceId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' })
    .expect(403);
  assert.equal(response.body.error.code, 'VOICE_NOT_ELIGIBLE');
  await app.close();
});

test('preview when provider unavailable returns safe error', async () => {
  const app = await createApp({
    previewForUser: async () => {
      throw new ApplicationError(
        'VOICE_PREVIEW_FAILED',
        'Voice preview is temporarily unavailable. Please try again.',
        503,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .post(`/api/v1/voices/${voiceId}/preview`)
    .send({})
    .expect(503);
  assert.equal(response.body.error.code, 'VOICE_PREVIEW_FAILED');
  await app.close();
});
