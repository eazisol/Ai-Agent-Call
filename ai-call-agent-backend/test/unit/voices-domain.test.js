const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  VoicesService,
  VoiceCatalogSyncService,
} = require('../../dist/modules/voices/voices.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (Array.isArray(value)) {
      return value.includes(row[key]);
    }
    if (
      value &&
      typeof value === 'object' &&
      Array.isArray(value._value) &&
      value._type === 'in'
    ) {
      return value._value.includes(row[key]);
    }
    return row[key] === value;
  });
}

function createHarness({
  membersSeed = [],
  businessSeed = [],
  agentSeed = [],
  assetSeed = [],
  mappingSeed = [],
  configSeed = [],
  providerConfigured = true,
} = {}) {
  const assetRows = [...assetSeed];
  const mappingRows = [...mappingSeed];
  const businessRows = [...businessSeed];
  const agentRows = [...agentSeed];
  const configRows = [...configSeed];

  const assets = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) item.id = randomUUID();
        item.createdAt = item.createdAt ?? new Date();
        item.updatedAt = item.updatedAt ?? new Date();
        const index = assetRows.findIndex((row) => row.id === item.id);
        if (index >= 0) assetRows[index] = { ...assetRows[index], ...item };
        else assetRows.push({ ...item });
      }
      return Array.isArray(entity) ? list : list[0];
    },
    findOne: async ({ where = {} } = {}) =>
      assetRows.find((row) => matchesWhere(row, where)) ?? null,
    count: async ({ where = {} } = {}) =>
      assetRows.filter((row) => matchesWhere(row, where)).length,
    createQueryBuilder() {
      const state = {
        activeOnly: false,
        businessId: null,
        filters: {},
        skip: 0,
        take: 50,
      };
      const builder = {
        where(_clause, params) {
          if (params?.active === 'active') state.activeOnly = true;
          if (params?.businessId) state.businessId = params.businessId;
          return builder;
        },
        andWhere(clause, params) {
          if (clause.includes('businessId IS NULL')) {
            state.filters.eligible = params?.businessId;
          }
          if (params?.sourceType) state.filters.sourceType = params.sourceType;
          if (params?.genderPresentation) {
            state.filters.genderPresentation = params.genderPresentation;
          }
          return builder;
        },
        orderBy() {
          return builder;
        },
        skip(n) {
          state.skip = n;
          return builder;
        },
        take(n) {
          state.take = n;
          return builder;
        },
        async getManyAndCount() {
          let rows = assetRows.filter((row) => {
            if (state.activeOnly && row.status !== 'active') return false;
            if (state.filters.eligible != null) {
              const ok =
                row.businessId == null || row.businessId === state.filters.eligible;
              if (!ok) return false;
            }
            if (
              state.filters.sourceType &&
              row.sourceType !== state.filters.sourceType
            ) {
              return false;
            }
            if (
              state.filters.genderPresentation &&
              row.genderPresentation !== state.filters.genderPresentation
            ) {
              return false;
            }
            return true;
          });
          const total = rows.length;
          rows = rows.slice(state.skip, state.skip + state.take);
          return [rows, total];
        },
        async getMany() {
          const [rows] = await builder.getManyAndCount();
          return rows;
        },
      };
      return builder;
    },
  };

  const mappings = {
    findOne: async ({ where = {} } = {}) =>
      mappingRows.find((row) => matchesWhere(row, where)) ?? null,
    find: async ({ where = {} } = {}) =>
      mappingRows.filter((row) => matchesWhere(row, where)),
    save: async (entity) => {
      const index = mappingRows.findIndex((row) => row.id === entity.id);
      if (index >= 0) mappingRows[index] = { ...mappingRows[index], ...entity };
      else {
        entity.id = entity.id ?? randomUUID();
        mappingRows.push({ ...entity });
      }
      return entity;
    },
  };

  const agents = {
    findOne: async ({ where = {}, relations } = {}) => {
      const agent = agentRows.find((row) => matchesWhere(row, where));
      if (!agent) return null;
      const clone = { ...agent };
      if (relations?.config) {
        clone.config =
          configRows.find((cfg) => cfg.agentId === agent.id) ?? null;
      }
      return clone;
    },
  };

  const agentConfigs = {
    save: async (entity) => {
      const index = configRows.findIndex((row) => row.agentId === entity.agentId);
      if (index >= 0) configRows[index] = { ...configRows[index], ...entity };
      else configRows.push({ ...entity });
      return entity;
    },
    count: async ({ where = {} } = {}) =>
      configRows.filter((row) => matchesWhere(row, where)).length,
    createQueryBuilder() {
      const state = { voiceId: null, businessId: null };
      return {
        innerJoinAndSelect() {
          return this;
        },
        where(_clause, params) {
          if (params?.voiceId) state.voiceId = params.voiceId;
          return this;
        },
        andWhere(_clause, params) {
          if (params?.businessId) state.businessId = params.businessId;
          return this;
        },
        async getMany() {
          return configRows
            .filter((cfg) => (state.voiceId ? cfg.voiceId === state.voiceId : true))
            .map((cfg) => ({
              ...cfg,
              agent: agentRows.find((a) => a.id === cfg.agentId),
            }))
            .filter((cfg) =>
              state.businessId ? cfg.agent?.businessId === state.businessId : true,
            );
        },
      };
    },
  };

  const businesses = {
    findOne: async ({ where = {} } = {}) =>
      businessRows.find((row) => matchesWhere(row, where)) ?? null,
  };

  const organizations = {
    requireMembership: async (userId, organizationId) => {
      const member = membersSeed.find(
        (row) => row.userId === userId && row.organizationId === organizationId,
      );
      if (!member) {
        throw new ApplicationError('FORBIDDEN', 'Forbidden', 403);
      }
      return member;
    },
  };

  const catalog = {
    providerName: 'elevenlabs',
    isConfigured: () => providerConfigured,
    listVoices: async () => [],
    previewVoice: async (input) => {
      assert.equal(input.catalogPreviewUrl ?? null, input.catalogPreviewUrl ?? null);
      return {
        audioBytes: Buffer.from('audio'),
        contentType: 'audio/mpeg',
      };
    },
  };

  const catalogSync = new VoiceCatalogSyncService(
    { get: () => 3600 },
    { transaction: async (fn) => fn({ create: assets.create, save: assets.save }) },
    catalog,
    assets,
    mappings,
    agentConfigs,
  );

  const service = new VoicesService(
    { transaction: async (fn) => fn({ create: assets.create, save: assets.save }) },
    organizations,
    catalogSync,
    catalog,
    assets,
    mappings,
    agents,
    agentConfigs,
    businesses,
  );

  return {
    service,
    assetRows,
    configRows,
    mappingRows,
    catalog,
  };
}

const userId = '11111111-1111-4111-8111-111111111111';
const orgId = '22222222-2222-4222-8222-222222222222';
const bizId = '33333333-3333-4333-8333-333333333333';
const otherBizId = '44444444-4444-4444-8444-444444444444';
const voiceGlobalId = '55555555-5555-4555-8555-555555555555';
const voiceCloneId = '66666666-6666-4666-8666-666666666666';
const agentAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const agentBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function baseSeeds() {
  return {
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        id: bizId,
        organizationId: orgId,
        status: 'active',
        defaultLanguage: 'en',
        languages: ['en'],
      },
      {
        id: otherBizId,
        organizationId: orgId,
        status: 'active',
        defaultLanguage: 'en',
        languages: ['en'],
      },
    ],
    agentSeed: [
      {
        id: agentAId,
        businessId: bizId,
        name: 'Agent A',
        status: 'active',
      },
    ],
    configSeed: [
      {
        agentId: agentAId,
        voiceId: null,
        voicePreference: 'neutral',
        useBusinessLanguageSettings: true,
        language: 'en',
        languages: ['en'],
      },
    ],
    assetSeed: [
      {
        id: voiceGlobalId,
        businessId: null,
        sourceType: 'provider_catalog',
        displayName: 'Sarah',
        description: 'Warm receptionist',
        languageCodes: ['en'],
        genderPresentation: 'female',
        accent: 'American',
        styleLabels: ['warm'],
        previewSampleText: 'Hello',
        status: 'active',
      },
      {
        id: voiceCloneId,
        businessId: otherBizId,
        sourceType: 'business_clone',
        displayName: 'Owner Clone',
        description: null,
        languageCodes: ['en'],
        genderPresentation: 'neutral',
        accent: null,
        styleLabels: [],
        previewSampleText: null,
        status: 'active',
      },
    ],
    mappingSeed: [
      {
        id: randomUUID(),
        voiceAssetId: voiceGlobalId,
        provider: 'elevenlabs',
        externalVoiceId: 'el-sarah',
        metadata: {
          previewUrl: 'https://storage.googleapis.com/eleven-public-prod/preview/sample.mp3',
        },
      },
    ],
  };
}

test('list eligible voices for active business', async () => {
  const { service } = createHarness(baseSeeds());
  const result = await service.listForUser(userId, orgId, bizId, {});
  assert.ok(result.voices.some((voice) => voice.id === voiceGlobalId));
  assert.equal(result.voices.find((v) => v.id === voiceCloneId), undefined);
  const sarah = result.voices.find((voice) => voice.id === voiceGlobalId);
  assert.equal(
    sarah.previewAudioUrl,
    'https://storage.googleapis.com/eleven-public-prod/preview/sample.mp3',
  );
});

test('serve cached catalogue voices when provider refresh fails', async () => {
  const harness = createHarness(baseSeeds());
  harness.catalog.listVoices = async () => {
    throw new ApplicationError(
      'VOICE_CATALOG_UNAVAILABLE',
      'Unable to reach the ElevenLabs API. Check your internet connection, VPN, or firewall and try again.',
      503,
    );
  };

  const result = await harness.service.listForUser(userId, orgId, bizId, {});
  assert.ok(result.voices.some((voice) => voice.id === voiceGlobalId));
});

test('assign shared catalogue voice to agent', async () => {
  const harness = createHarness(baseSeeds());
  const assignment = await harness.service.assignAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentAId,
    voiceGlobalId,
  );
  assert.equal(assignment.voiceId, voiceGlobalId);
  assert.equal(assignment.voice.displayName, 'Sarah');
  assert.equal(
    harness.configRows.find((cfg) => cfg.agentId === agentAId).voiceId,
    voiceGlobalId,
  );
});

test('block cross-business clone assignment', async () => {
  const harness = createHarness(baseSeeds());
  await assert.rejects(
    () =>
      harness.service.assignAgentVoiceForUser(
        userId,
        orgId,
        bizId,
        agentAId,
        voiceCloneId,
      ),
    (error) => {
      assert.equal(error.code, 'VOICE_NOT_ELIGIBLE');
      return true;
    },
  );
});

test('resolve external voice id for provider sync', async () => {
  const harness = createHarness(baseSeeds());
  const externalId = await harness.service.resolveExternalVoiceId(voiceGlobalId);
  assert.equal(externalId, 'el-sarah');
});

test('clear agent voice assignment', async () => {
  const harness = createHarness(baseSeeds());
  await harness.service.assignAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentAId,
    voiceGlobalId,
  );
  const cleared = await harness.service.clearAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentAId,
  );
  assert.equal(cleared.voiceId, null);
  assert.equal(
    harness.configRows.find((cfg) => cfg.agentId === agentAId).voiceId,
    null,
  );
});

test('same voice reusable across multiple same-business agents', async () => {
  const seeds = {
    ...baseSeeds(),
    agentSeed: [
      {
        id: agentAId,
        businessId: bizId,
        name: 'Agent A',
        status: 'active',
      },
      {
        id: agentBId,
        businessId: bizId,
        name: 'Agent B',
        status: 'active',
      },
    ],
    configSeed: [
      {
        agentId: agentAId,
        voiceId: null,
        voicePreference: 'neutral',
        useBusinessLanguageSettings: true,
        language: 'en',
        languages: ['en'],
      },
      {
        agentId: agentBId,
        voiceId: null,
        voicePreference: 'neutral',
        useBusinessLanguageSettings: true,
        language: 'en',
        languages: ['en'],
      },
    ],
  };
  const harness = createHarness(seeds);
  await harness.service.assignAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentAId,
    voiceGlobalId,
  );
  await harness.service.assignAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentBId,
    voiceGlobalId,
  );
  assert.equal(harness.assetRows.length, 2);
  assert.equal(
    harness.configRows.find((cfg) => cfg.agentId === agentAId).voiceId,
    voiceGlobalId,
  );
  assert.equal(
    harness.configRows.find((cfg) => cfg.agentId === agentBId).voiceId,
    voiceGlobalId,
  );
});

test('changing Agent A voice does not modify Agent B', async () => {
  const voiceAltId = '77777777-7777-4777-8777-777777777777';
  const seeds = {
    ...baseSeeds(),
    agentSeed: [
      {
        id: agentAId,
        businessId: bizId,
        name: 'Agent A',
        status: 'active',
      },
      {
        id: agentBId,
        businessId: bizId,
        name: 'Agent B',
        status: 'active',
      },
    ],
    configSeed: [
      {
        agentId: agentAId,
        voiceId: voiceGlobalId,
        voicePreference: 'neutral',
        useBusinessLanguageSettings: true,
        language: 'en',
        languages: ['en'],
      },
      {
        agentId: agentBId,
        voiceId: voiceGlobalId,
        voicePreference: 'neutral',
        useBusinessLanguageSettings: true,
        language: 'en',
        languages: ['en'],
      },
    ],
    assetSeed: [
      ...baseSeeds().assetSeed,
      {
        id: voiceAltId,
        businessId: null,
        sourceType: 'provider_catalog',
        displayName: 'James',
        description: null,
        languageCodes: ['en'],
        genderPresentation: 'male',
        accent: null,
        styleLabels: [],
        previewSampleText: null,
        status: 'active',
      },
    ],
    mappingSeed: [
      ...baseSeeds().mappingSeed,
      {
        id: randomUUID(),
        voiceAssetId: voiceAltId,
        provider: 'elevenlabs',
        externalVoiceId: 'el-james',
        metadata: {},
      },
    ],
  };
  const harness = createHarness(seeds);
  await harness.service.assignAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentAId,
    voiceAltId,
  );
  assert.equal(
    harness.configRows.find((cfg) => cfg.agentId === agentAId).voiceId,
    voiceAltId,
  );
  assert.equal(
    harness.configRows.find((cfg) => cfg.agentId === agentBId).voiceId,
    voiceGlobalId,
  );
});

test('compatibility warning when voice languages mismatch agent', async () => {
  const seeds = {
    ...baseSeeds(),
    businessSeed: [
      {
        id: bizId,
        organizationId: orgId,
        status: 'active',
        defaultLanguage: 'de',
        languages: ['de'],
      },
    ],
    assetSeed: [
      {
        id: voiceGlobalId,
        businessId: null,
        sourceType: 'provider_catalog',
        displayName: 'Sarah',
        description: null,
        languageCodes: ['en'],
        genderPresentation: 'female',
        accent: null,
        styleLabels: [],
        previewSampleText: null,
        status: 'active',
      },
    ],
  };
  const harness = createHarness(seeds);
  const assignment = await harness.service.assignAgentVoiceForUser(
    userId,
    orgId,
    bizId,
    agentAId,
    voiceGlobalId,
  );
  assert.ok(assignment.warnings.length > 0);
});

test('preview returns audio bytes without exposing provider mapping', async () => {
  const harness = createHarness(baseSeeds());
  let receivedInput = null;
  harness.catalog.previewVoice = async (input) => {
    receivedInput = input;
    return {
      audioBytes: Buffer.from('audio'),
      contentType: 'audio/mpeg',
    };
  };
  const preview = await harness.service.previewForUser(
    userId,
    orgId,
    bizId,
    voiceGlobalId,
  );
  assert.equal(preview.contentType, 'audio/mpeg');
  assert.ok(preview.audioBase64);
  assert.equal(typeof preview.externalVoiceId, 'undefined');
  assert.equal(
    receivedInput.catalogPreviewUrl,
    'https://storage.googleapis.com/eleven-public-prod/preview/sample.mp3',
  );
});

test('viewer cannot assign agent voice', async () => {
  const seeds = {
    ...baseSeeds(),
    membersSeed: [{ userId, organizationId: orgId, role: 'viewer' }],
  };
  const harness = createHarness(seeds);
  await assert.rejects(
    () =>
      harness.service.assignAgentVoiceForUser(
        userId,
        orgId,
        bizId,
        agentAId,
        voiceGlobalId,
      ),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});

test('assign archived voice is blocked', async () => {
  const seeds = {
    ...baseSeeds(),
    assetSeed: [
      {
        ...baseSeeds().assetSeed[0],
        status: 'archived',
      },
      baseSeeds().assetSeed[1],
    ],
  };
  const harness = createHarness(seeds);
  await assert.rejects(
    () =>
      harness.service.assignAgentVoiceForUser(
        userId,
        orgId,
        bizId,
        agentAId,
        voiceGlobalId,
      ),
    (error) => {
      assert.equal(error.code, 'VOICE_NOT_ELIGIBLE');
      return true;
    },
  );
});
