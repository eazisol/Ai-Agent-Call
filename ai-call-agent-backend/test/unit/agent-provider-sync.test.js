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
  voiceSummary: null,
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

  const voices = {
    resolveExternalVoiceId: async (voiceId) =>
      voiceId === 'voice-assigned-1' ? 'el-voice-sarah' : null,
  };

  const service = new AgentProviderSyncService(
    dataSource,
    organizations,
    voiceSync,
    agents,
    voices,
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
        save: async (row) => ({
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

  voiceSync.getStatus = async (id) => ({
    externalAgentId: id,
    exists: true,
    name: 'Front Desk',
    rawStatus: 'available',
  });
  voiceSync.update = async (id) => {
    updated = true;
    assert.equal(id, 'el-agent-1');
    return { externalAgentId: id, warnings: [] };
  };
  voiceSync.create = async () => {
    throw new Error('should not create');
  };

  const voices = {
    resolveExternalVoiceId: async () => null,
  };

  const service2 = new AgentProviderSyncService(
    dataSource,
    organizations,
    voiceSync,
    agents,
    voices,
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

test('synced mapping with provider 404 is not considered healthy', async () => {
  const { voiceSync } = createSyncHarness();
  const mappingUpdates = [];
  const staleMapping = {
    id: 'mapping-prod',
    agentId: agentView.id,
    provider: ELEVENLABS_PROVIDER,
    externalAgentId: 'agent_6501_stale',
    syncStatus: 'synced',
    lastSyncedAt: new Date(),
    lastError: null,
  };
  const mappings = {
    findOne: async () => staleMapping,
    findOneByOrFail: async () => staleMapping,
    save: async (row) => row,
    update: async (criteria, patch) => {
      mappingUpdates.push({ criteria, patch });
      return { affected: 1 };
    },
  };
  voiceSync.getStatus = async (id) => ({
    externalAgentId: id,
    exists: false,
    name: null,
    rawStatus: 'missing',
  });

  const service = new AgentProviderSyncService(
    { transaction: async () => null },
    { requireMembership: async () => ({ role: 'owner' }) },
    voiceSync,
    { getForUser: async () => agentView },
    { resolveExternalVoiceId: async () => null },
    mappings,
  );

  const status = await service.getStatusForUser(
    'user-1',
    agentView.organizationId,
    agentView.businessId,
    agentView.id,
  );

  assert.equal(status.syncStatus, 'error');
  assert.equal(status.remote.exists, false);
  assert.equal(status.remote.checked, true);
  assert.equal(mappingUpdates.length, 1);
  assert.equal(mappingUpdates[0].patch.syncStatus, 'error');
});

test('resync stale mapping creates new provider agent and stores new id', async () => {
  const staleId = 'agent_6501_stale';
  const hrAgentId = 'agent_7101_hr';
  const newId = 'agent_new_prod';
  let created = false;
  let updated = false;
  let savedCleared = false;
  const hrMapping = {
    id: 'mapping-hr',
    agentId: 'hr-agent-canonical',
    provider: ELEVENLABS_PROVIDER,
    externalAgentId: hrAgentId,
    syncStatus: 'synced',
  };

  const dataSource = {
    transaction: async (fn) => {
      const manager = {
        findOne: async () => ({
          id: 'mapping-1',
          agentId: agentView.id,
          provider: ELEVENLABS_PROVIDER,
          externalAgentId: staleId,
          syncStatus: 'synced',
          updatedAt: new Date(0),
          lastSyncedAt: new Date(),
          lastError: null,
        }),
        create: () => {
          throw new Error('should not create mapping row');
        },
        save: async (row) => ({
          ...row,
          syncStatus: 'pending',
          lastError: null,
        }),
      };
      return fn(manager);
    },
  };

  const mappings = {
    findOneByOrFail: async () => ({
      id: 'mapping-1',
      externalAgentId: newId,
      syncStatus: 'pending',
      lastSyncedAt: null,
      lastError: null,
    }),
    save: async (row) => {
      if (row.externalAgentId === null) {
        savedCleared = true;
      }
      return row;
    },
    update: async () => ({ affected: 1 }),
    findOne: async ({ where }) => {
      if (where?.agentId === 'hr-agent-canonical') {
        return { ...hrMapping };
      }
      return null;
    },
  };

  const voiceSync = {
    providerName: 'elevenlabs',
    isConfigured: () => true,
    getStatus: async (id) => {
      if (id === staleId) {
        return {
          externalAgentId: id,
          exists: false,
          name: null,
          rawStatus: 'missing',
        };
      }
      if (id === hrAgentId) {
        return {
          externalAgentId: id,
          exists: true,
          name: 'HR Agent',
          rawStatus: 'available',
        };
      }
      return {
        externalAgentId: id,
        exists: true,
        name: 'Front Desk',
        rawStatus: 'available',
      };
    },
    create: async (input) => {
      created = true;
      assert.equal(input.name, 'Front Desk');
      assert.notEqual(input.name, 'HR Agent');
      return { externalAgentId: newId, warnings: [] };
    },
    update: async () => {
      updated = true;
      throw new Error('should not update stale id');
    },
    deactivate: async () => undefined,
    delete: async () => undefined,
  };

  const service = new AgentProviderSyncService(
    dataSource,
    { requireMembership: async () => ({ role: 'owner' }) },
    voiceSync,
    { getForUser: async () => agentView },
    { resolveExternalVoiceId: async () => null },
    mappings,
  );

  const result = await service.syncForUser(
    'user-1',
    agentView.organizationId,
    agentView.businessId,
    agentView.id,
  );

  assert.equal(created, true);
  assert.equal(updated, false);
  assert.equal(savedCleared, true);
  assert.equal(result.sync.syncStatus, 'synced');
  assert.equal(result.sync.externalAgentId, newId);
  assert.notEqual(result.sync.externalAgentId, staleId);
  assert.notEqual(result.sync.externalAgentId, hrAgentId);

  // Unrelated HR Agent mapping remains untouched
  const hrAfter = await mappings.findOne({
    where: { agentId: 'hr-agent-canonical' },
  });
  assert.equal(hrAfter.externalAgentId, hrAgentId);
  assert.equal(hrAfter.syncStatus, 'synced');
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
