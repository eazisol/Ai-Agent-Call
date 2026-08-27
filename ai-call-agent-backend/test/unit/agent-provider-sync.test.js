const assert = require('node:assert/strict');
const test = require('node:test');
const {
  AgentProviderSyncService,
  ELEVENLABS_PROVIDER,
  mapProviderMappings,
} = require('../../dist/modules/agents/agent-provider-sync.service');
const {
  ElevenLabsVoiceAgentSyncAdapter,
} = require('../../dist/providers/elevenlabs/elevenlabs-voice-agent-sync.adapter');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

const agentView = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  businessId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  organizationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  name: 'Front Desk',
  status: 'active',
  roleLabel: 'Receptionist',
  personality: null,
  greeting: 'Hello',
  instructions: 'Be helpful',
  useBusinessLanguageSettings: true,
  languageMode: 'single',
  language: 'en',
  languages: ['en'],
  languageDetectionEnabled: false,
  languageSwitchingEnabled: false,
  voicePreference: 'neutral',
  voiceId: null,
  escalationEnabled: false,
  escalationKeywords: [],
  escalationContactPhone: null,
  escalationContactEmail: null,
  escalationMessage: null,
  providerMappings: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createSyncHarness(voiceOverrides = {}) {
  const voiceSync = {
    providerName: 'elevenlabs',
    isConfigured: () => true,
    create: async () => ({ externalAgentId: 'el-agent-1', warnings: [] }),
    update: async () => ({ externalAgentId: 'el-agent-1', warnings: [] }),
    deactivate: async () => undefined,
    delete: async () => undefined,
    getStatus: async () => ({
      externalAgentId: 'el-agent-1',
      exists: true,
      name: 'Front Desk',
      rawStatus: 'available',
    }),
    ...voiceOverrides,
  };

  const agents = {
    getForUser: async () => agentView,
  };

  const mappingUpdates = [];
  const mappings = {
    findOne: async () => null,
    findOneByOrFail: async () => ({
      id: 'mapping-1',
      agentId: agentView.id,
      provider: ELEVENLABS_PROVIDER,
      externalAgentId: null,
      syncStatus: 'pending',
      lastSyncedAt: null,
      lastError: null,
    }),
    save: async (row) => row,
    update: async (criteria, patch) => {
      mappingUpdates.push({ criteria, patch });
      return { affected: 1 };
    },
  };

  const dataSource = {
    transaction: async (fn) => {
      const manager = {
        findOne: async () => null,
        create: (_entity, data) => ({
          id: 'mapping-1',
          updatedAt: new Date(0),
          ...data,
        }),
        save: async (row) => ({
          id: 'mapping-1',
          externalAgentId: null,
          updatedAt: new Date(),
          ...row,
          syncStatus: 'pending',
          lastError: null,
        }),
      };
      return fn(manager);
    },
  };

  const organizations = {
    requireMembership: async () => ({ role: 'owner' }),
  };

  const service = new AgentProviderSyncService(
    dataSource,
    organizations,
    voiceSync,
    agents,
    mappings,
  );

  return { service, voiceSync, mappings, mappingUpdates };
}

test('mapProviderMappings maps entity rows', () => {
  const views = mapProviderMappings([
    {
      provider: 'elevenlabs',
      syncStatus: 'synced',
      externalAgentId: 'el-1',
      lastSyncedAt: new Date('2026-01-01'),
      lastError: null,
    },
  ]);
  assert.equal(views.length, 1);
  assert.equal(views[0].externalAgentId, 'el-1');
});

test('sync creates remote agent on first sync', async () => {
  const { service, voiceSync } = createSyncHarness();
  let created = false;
  voiceSync.create = async () => {
    created = true;
    return { externalAgentId: 'el-new', warnings: [] };
  };
  voiceSync.update = async () => {
    throw new Error('should not update');
  };

  const result = await service.syncForUser(
    'user-1',
    agentView.organizationId,
    agentView.businessId,
    agentView.id,
  );

  assert.equal(created, true);
  assert.equal(result.sync.syncStatus, 'synced');
  assert.equal(result.sync.externalAgentId, 'el-new');
});

test('sync updates when mapping already has external id', async () => {
  const { service, voiceSync } = createSyncHarness();
  let updated = false;

  const dataSource = {
    transaction: async (fn) => {
      const manager = {
        findOne: async () => ({
          id: 'mapping-1',
          agentId: agentView.id,
          provider: ELEVENLABS_PROVIDER,
          externalAgentId: 'el-agent-1',
          syncStatus: 'synced',
          updatedAt: new Date(0),
          lastSyncedAt: new Date(),
          lastError: null,
        }),
        create: () => {
          throw new Error('should not create');
        },
        save: async (row) => ({ ...row, syncStatus: 'pending', lastError: null }),
      };
      return fn(manager);
    },
  };

  const organizations = {
    requireMembership: async () => ({ role: 'owner' }),
  };
  const agents = { getForUser: async () => agentView };
  const mappings = {
    findOneByOrFail: async () => ({
      id: 'mapping-1',
      externalAgentId: 'el-agent-1',
      syncStatus: 'pending',
      lastSyncedAt: null,
      lastError: null,
    }),
    save: async (row) => row,
    update: async () => ({ affected: 1 }),
  };

  voiceSync.update = async (id) => {
    updated = true;
    assert.equal(id, 'el-agent-1');
    return { externalAgentId: id, warnings: [] };
  };
  voiceSync.create = async () => {
    throw new Error('should not create');
  };

  const service2 = new AgentProviderSyncService(
    dataSource,
    organizations,
    voiceSync,
    agents,
    mappings,
  );

  await service2.syncForUser(
    'user-1',
    agentView.organizationId,
    agentView.businessId,
    agentView.id,
  );
  assert.equal(updated, true);
});

test('sync returns PROVIDER_NOT_CONFIGURED when key missing', async () => {
  const { service } = createSyncHarness({
    isConfigured: () => false,
  });
  await assert.rejects(
    () =>
      service.syncForUser(
        'user-1',
        agentView.organizationId,
        agentView.businessId,
        agentView.id,
      ),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PROVIDER_NOT_CONFIGURED',
  );
});

test('sync records sanitized error on provider failure', async () => {
  const { service, mappingUpdates } = createSyncHarness({
    create: async () => {
      throw new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The voice provider is temporarily unavailable. Please try again.',
        503,
      );
    },
  });

  await assert.rejects(
    () =>
      service.syncForUser(
        'user-1',
        agentView.organizationId,
        agentView.businessId,
        agentView.id,
      ),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PROVIDER_UNAVAILABLE',
  );

  assert.equal(mappingUpdates.length, 1);
  assert.equal(mappingUpdates[0].patch.syncStatus, 'error');
  assert.match(mappingUpdates[0].patch.lastError, /temporarily unavailable/);
});

test('provider status is not_provisioned without mapping', async () => {
  const { service, voiceSync } = createSyncHarness();
  let statusCalled = false;
  voiceSync.getStatus = async () => {
    statusCalled = true;
    return { externalAgentId: 'x', exists: true };
  };

  const status = await service.getStatusForUser(
    'user-1',
    agentView.organizationId,
    agentView.businessId,
    agentView.id,
  );
  assert.equal(status.syncStatus, 'not_provisioned');
  assert.equal(status.remote.checked, false);
  assert.equal(statusCalled, false);
});

test('ElevenLabs adapter create returns id and language warnings', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ agent_id: 'el-123' }),
  });

  try {
    const adapter = new ElevenLabsVoiceAgentSyncAdapter({
      get: (key) =>
        ({
          'elevenlabs.apiKey': 'test-key',
          'elevenlabs.baseUrl': 'https://api.elevenlabs.io',
          'elevenlabs.timeoutMs': 5000,
          'elevenlabs.voiceFemale': 'female-voice',
          'elevenlabs.voiceMale': 'male-voice',
          'elevenlabs.voiceNeutral': 'neutral-voice',
        })[key],
    });

    const result = await adapter.create({
      name: 'Front Desk',
      roleLabel: 'Receptionist',
      personality: null,
      greeting: 'Hello',
      instructions: 'Help callers',
      language: 'en',
      languages: ['en', 'ur'],
      languageDetectionEnabled: false,
      languageSwitchingEnabled: false,
      voicePreference: 'neutral',
    });

    assert.equal(result.externalAgentId, 'el-123');
    assert.equal(
      result.warnings.some((w) => w.includes('ur')),
      true,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('ElevenLabs adapter maps 401 to PROVIDER_AUTH_FAILED', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => JSON.stringify({ detail: 'secret-token-xyz' }),
  });

  try {
    const adapter = new ElevenLabsVoiceAgentSyncAdapter({
      get: (key) =>
        ({
          'elevenlabs.apiKey': 'test-key',
          'elevenlabs.baseUrl': 'https://api.elevenlabs.io',
          'elevenlabs.timeoutMs': 5000,
          'elevenlabs.voiceFemale': 'f',
          'elevenlabs.voiceMale': 'm',
          'elevenlabs.voiceNeutral': 'n',
        })[key],
    });

    await assert.rejects(
      () =>
        adapter.create({
          name: 'A',
          roleLabel: 'R',
          personality: null,
          greeting: 'Hi',
          instructions: 'Do',
          language: 'en',
          languages: ['en'],
          languageDetectionEnabled: false,
          languageSwitchingEnabled: false,
          voicePreference: 'neutral',
        }),
      (error) =>
        error instanceof ApplicationError &&
        error.code === 'PROVIDER_AUTH_FAILED' &&
        !error.message.includes('secret-token'),
    );
  } finally {
    global.fetch = originalFetch;
  }
});
