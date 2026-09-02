const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  VoiceClonesService,
} = require('../../dist/modules/voice-clones/voice-clones.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function createHarness({
  membersSeed = [],
  businessSeed = [],
  cloneSeed = [],
  consentSeed = [],
  sampleSeed = [],
  assetSeed = [],
  mappingSeed = [],
  configSeed = [],
  agentSeed = [],
  objectStorageEnabled = true,
  providerConfigured = true,
} = {}) {
  const cloneRows = [...cloneSeed];
  const consentRows = [...consentSeed];
  const sampleRows = [...sampleSeed];
  const assetRows = [...assetSeed];
  const mappingRows = [...mappingSeed];
  const configRows = [...configSeed];
  const agentRows = [...agentSeed];
  const storage = new Map();

  const clones = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) item.id = randomUUID();
        item.createdAt = item.createdAt ?? new Date();
        item.updatedAt = item.updatedAt ?? new Date();
        const index = cloneRows.findIndex((row) => row.id === item.id);
        if (index >= 0) cloneRows[index] = { ...cloneRows[index], ...item };
        else cloneRows.push({ ...item });
      }
      return Array.isArray(entity) ? list : list[0];
    },
    findOne: async ({ where = {} } = {}) =>
      cloneRows.find((row) => matchesWhere(row, where)) ?? null,
    delete: async ({ id }) => {
      const index = cloneRows.findIndex((row) => row.id === id);
      if (index >= 0) cloneRows.splice(index, 1);
    },
    count: async ({ where = {} } = {}) =>
      cloneRows.filter((row) => matchesWhere(row, where)).length,
    createQueryBuilder() {
      const state = { businessId: null, status: null, skip: 0, take: 20 };
      const builder = {
        where(_clause, params) {
          if (params?.businessId) state.businessId = params.businessId;
          return builder;
        },
        andWhere(_clause, params) {
          if (params?.status) state.status = params.status;
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
          let rows = cloneRows.filter((row) => {
            if (state.businessId && row.businessId !== state.businessId) {
              return false;
            }
            if (state.status && row.status !== state.status) {
              return false;
            }
            return true;
          });
          const total = rows.length;
          rows = rows.slice(state.skip, state.skip + state.take);
          return [rows, total];
        },
      };
      return builder;
    },
  };

  const consents = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      entity.id = entity.id ?? randomUUID();
      entity.createdAt = entity.createdAt ?? new Date();
      consentRows.push({ ...entity });
      return entity;
    },
    count: async ({ where = {} } = {}) =>
      consentRows.filter((row) => matchesWhere(row, where)).length,
    find: async ({ where = {}, order, take } = {}) => {
      let rows = consentRows.filter((row) => matchesWhere(row, where));
      if (order?.acceptedAt === 'DESC') {
        rows = rows.sort(
          (a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime(),
        );
      }
      if (take) rows = rows.slice(0, take);
      return rows;
    },
  };

  const samples = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      entity.id = entity.id ?? randomUUID();
      entity.createdAt = entity.createdAt ?? new Date();
      entity.updatedAt = entity.updatedAt ?? new Date();
      const index = sampleRows.findIndex((row) => row.id === entity.id);
      if (index >= 0) sampleRows[index] = { ...sampleRows[index], ...entity };
      else sampleRows.push({ ...entity });
      return entity;
    },
    find: async ({ where = {}, order } = {}) => {
      let rows = sampleRows.filter((row) => matchesWhere(row, where));
      if (order?.createdAt === 'ASC') {
        rows = rows.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
      }
      return rows;
    },
    findOne: async ({ where = {} } = {}) =>
      sampleRows.find((row) => matchesWhere(row, where)) ?? null,
    count: async ({ where = {} } = {}) =>
      sampleRows.filter((row) => matchesWhere(row, where)).length,
  };

  const assets = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      if (!entity.id) entity.id = randomUUID();
      const index = assetRows.findIndex((row) => row.id === entity.id);
      if (index >= 0) assetRows[index] = { ...assetRows[index], ...entity };
      else assetRows.push({ ...entity });
      return entity;
    },
    findOne: async ({ where = {} } = {}) =>
      assetRows.find((row) => matchesWhere(row, where)) ?? null,
    delete: async ({ id }) => {
      const index = assetRows.findIndex((row) => row.id === id);
      if (index >= 0) assetRows.splice(index, 1);
    },
  };

  const mappings = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      entity.id = entity.id ?? randomUUID();
      mappingRows.push({ ...entity });
      return entity;
    },
    findOne: async ({ where = {} } = {}) =>
      mappingRows.find((row) => matchesWhere(row, where)) ?? null,
    delete: async ({ voiceAssetId }) => {
      for (let i = mappingRows.length - 1; i >= 0; i -= 1) {
        if (mappingRows[i].voiceAssetId === voiceAssetId) {
          mappingRows.splice(i, 1);
        }
      }
    },
  };

  const agentConfigs = {
    createQueryBuilder() {
      const state = { voiceAssetId: null, businessId: null };
      const builder = {
        innerJoinAndSelect() {
          return builder;
        },
        where(_clause, params) {
          if (params?.voiceAssetId) state.voiceAssetId = params.voiceAssetId;
          return builder;
        },
        andWhere(_clause, params) {
          if (params?.businessId) state.businessId = params.businessId;
          return builder;
        },
        async getMany() {
          return configRows
            .filter((cfg) => {
              if (state.voiceAssetId && cfg.voiceId !== state.voiceAssetId) {
                return false;
              }
              const agent = agentRows.find((row) => row.id === cfg.agentId);
              if (!agent) return false;
              if (state.businessId && agent.businessId !== state.businessId) {
                return false;
              }
              cfg.agent = agent;
              return true;
            })
            .map((cfg) => ({ ...cfg, agent: cfg.agent }));
        },
      };
      return builder;
    },
  };

  const businesses = {
    findOne: async ({ where = {} } = {}) =>
      businessSeed.find((row) => matchesWhere(row, where)) ?? null,
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

  const cloneProvider = {
    providerName: 'elevenlabs',
    isConfigured: () => providerConfigured,
    createClone: async () => ({
      externalVoiceId: 'el-clone-1',
      metadata: { syncStatus: 'synced' },
    }),
    deleteClone: async () => {},
  };

  const catalog = {
    providerName: 'elevenlabs',
    getVoice: async () => ({
      externalVoiceId: 'el-clone-1',
      metadata: { previewUrl: 'https://example.com/preview.mp3' },
    }),
  };

  const objectStorage = {
    putObject: async (key, body) => {
      storage.set(key, body);
    },
    getObject: async (key) => storage.get(key) ?? Buffer.from('audio'),
    deleteObject: async (key) => {
      storage.delete(key);
    },
  };

  const service = new VoiceClonesService(
    {
      get: (key) => {
        if (key === 'objectStorage.enabled') return objectStorageEnabled;
        if (key === 'voiceClones.maxSamples') return 5;
        if (key === 'voiceClones.maxSampleBytes') return 25 * 1024 * 1024;
        return undefined;
      },
    },
    {
      transaction: async (fn) =>
        fn({
          create: (_entity, data) => data,
          save: async (entityClassOrEntity, maybeEntity) => {
            const data = maybeEntity ?? entityClassOrEntity;
            if (data?.sourceType === 'business_clone') {
              return assets.save(data);
            }
            if (data?.externalVoiceId) {
              return mappings.save(data);
            }
            if (data?.status === 'ready' || data?.voiceAssetId != null) {
              return clones.save(data);
            }
            return data;
          },
        }),
    },
    organizations,
    cloneProvider,
    catalog,
    objectStorage,
    clones,
    consents,
    samples,
    assets,
    mappings,
    agentConfigs,
    businesses,
  );

  return {
    service,
    cloneRows,
    assetRows,
    mappingRows,
    sampleRows,
    storage,
    cloneProvider,
  };
}

const userId = '11111111-1111-4111-8111-111111111111';
const orgId = '22222222-2222-4222-8222-222222222222';
const bizId = '33333333-3333-4333-8333-333333333333';
const cloneId = '44444444-4444-4444-8444-444444444444';
const voiceAssetId = '55555555-5555-4555-8555-555555555555';
const agentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    ],
    agentSeed: [
      { id: agentId, businessId: bizId, name: 'Front Desk', status: 'active' },
    ],
  };
}

test('create draft clone', async () => {
  const { service, cloneRows } = createHarness(baseSeeds());
  const clone = await service.createDraftForUser(userId, orgId, bizId, {
    displayName: 'Owner Clone',
    description: 'Test',
  });
  assert.equal(clone.status, 'draft');
  assert.equal(cloneRows.length, 1);
  assert.equal(cloneRows[0].displayName, 'Owner Clone');
});

test('submit requires consent and samples', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        status: 'draft',
        provider: 'elevenlabs',
        createdByUserId: userId,
      },
    ],
  });

  await assert.rejects(
    () => harness.service.submitForUser(userId, orgId, bizId, cloneId),
    (error) => error.code === 'VOICE_CLONE_CONSENT_REQUIRED',
  );

  await harness.service.recordConsentForUser(userId, orgId, bizId, cloneId, {
    consentVersion: 'm09-v1',
    consentTextHash: 'a'.repeat(64),
  });

  await assert.rejects(
    () => harness.service.submitForUser(userId, orgId, bizId, cloneId),
    (error) => error.code === 'VOICE_CLONE_SAMPLES_REQUIRED',
  );
});

test('submit creates business voice asset', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        description: null,
        status: 'draft',
        provider: 'elevenlabs',
        createdByUserId: userId,
        voiceAssetId: null,
        lastError: null,
        submittedAt: null,
        readyAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    sampleSeed: [
      {
        id: randomUUID(),
        voiceCloneId: cloneId,
        businessId: bizId,
        storageKey: 'org/x/sample.mp3',
        originalFilename: 'sample.mp3',
        contentType: 'audio/mpeg',
        byteSize: '1000',
        checksumSha256: 'abc',
        status: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  harness.storage.set('org/x/sample.mp3', Buffer.from('audio-data'));

  await harness.service.recordConsentForUser(userId, orgId, bizId, cloneId, {
    consentVersion: 'm09-v1',
    consentTextHash: 'b'.repeat(64),
  });

  const result = await harness.service.submitForUser(
    userId,
    orgId,
    bizId,
    cloneId,
  );
  assert.equal(result.status, 'ready');
  assert.ok(result.voiceAssetId);
  assert.equal(harness.assetRows.length, 1);
  assert.equal(harness.assetRows[0].sourceType, 'business_clone');
  assert.equal(harness.assetRows[0].businessId, bizId);
  assert.equal(harness.mappingRows.length, 1);
});

test('delete blocked while assigned to agent', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        status: 'ready',
        provider: 'elevenlabs',
        voiceAssetId,
        createdByUserId: userId,
      },
    ],
    configSeed: [{ agentId, voiceId: voiceAssetId }],
  });

  await assert.rejects(
    () => harness.service.deleteForUser(userId, orgId, bizId, cloneId),
    (error) => error.code === 'VOICE_CLONE_IN_USE',
  );
});

test('viewer cannot create clone', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    membersSeed: [{ userId, organizationId: orgId, role: 'viewer' }],
  });
  await assert.rejects(
    () =>
      harness.service.createDraftForUser(userId, orgId, bizId, {
        displayName: 'Blocked',
      }),
    (error) => error.code === 'FORBIDDEN',
  );
});

test('cross-business clone access blocked', async () => {
  const otherBizId = '99999999-9999-4999-8999-999999999999';
  const harness = createHarness({
    ...baseSeeds(),
    cloneSeed: [
      {
        id: cloneId,
        businessId: otherBizId,
        displayName: 'Other Biz Clone',
        status: 'draft',
        provider: 'elevenlabs',
        createdByUserId: userId,
      },
    ],
  });

  await assert.rejects(
    () => harness.service.getForUser(userId, orgId, bizId, cloneId),
    (error) => error.code === 'VOICE_CLONE_NOT_FOUND',
  );
});

test('upload sample stores privately without exposing storage key', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        status: 'draft',
        provider: 'elevenlabs',
        createdByUserId: userId,
      },
    ],
  });

  const file = {
    buffer: Buffer.from('fake-audio'),
    mimetype: 'audio/webm',
    originalname: 'recording.webm',
    size: 11,
  };

  const result = await harness.service.uploadSampleForUser(
    userId,
    orgId,
    bizId,
    cloneId,
    file,
  );
  assert.equal(result.sample.originalFilename, 'recording.webm');
  assert.equal(harness.sampleRows.length, 1);
  assert.ok(harness.sampleRows[0].storageKey.includes('voice-samples'));
  assert.ok(harness.storage.size === 1);
  assert.equal(result.sample.storageKey, undefined);

  const detail = await harness.service.getForUser(
    userId,
    orgId,
    bizId,
    cloneId,
  );
  assert.equal(detail.samples.length, 1);
  assert.equal(detail.samples[0].storageKey, undefined);
});

test('upload sample blocked when object storage disabled', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    objectStorageEnabled: false,
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        status: 'draft',
        provider: 'elevenlabs',
        createdByUserId: userId,
      },
    ],
  });

  await assert.rejects(
    () =>
      harness.service.uploadSampleForUser(userId, orgId, bizId, cloneId, {
        buffer: Buffer.from('audio'),
        mimetype: 'audio/mpeg',
        originalname: 'sample.mp3',
        size: 5,
      }),
    (error) => error.code === 'OBJECT_STORAGE_NOT_CONFIGURED',
  );
});

test('manager cannot revoke clone', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    membersSeed: [{ userId, organizationId: orgId, role: 'manager' }],
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        status: 'ready',
        provider: 'elevenlabs',
        voiceAssetId,
        createdByUserId: userId,
      },
    ],
  });

  await assert.rejects(
    () => harness.service.revokeForUser(userId, orgId, bizId, cloneId),
    (error) => error.code === 'FORBIDDEN',
  );
});

test('delete removes private sample objects from storage', async () => {
  const sampleId = randomUUID();
  const storageKey = `org/${orgId}/biz/${bizId}/voice-samples/${cloneId}/${sampleId}/sample.mp3`;
  const harness = createHarness({
    ...baseSeeds(),
    cloneSeed: [
      {
        id: cloneId,
        businessId: bizId,
        displayName: 'Owner Clone',
        status: 'failed',
        provider: 'elevenlabs',
        voiceAssetId: null,
        createdByUserId: userId,
      },
    ],
    sampleSeed: [
      {
        id: sampleId,
        voiceCloneId: cloneId,
        businessId: bizId,
        storageKey,
        originalFilename: 'sample.mp3',
        contentType: 'audio/mpeg',
        byteSize: '1000',
        checksumSha256: 'abc',
        status: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });
  harness.storage.set(storageKey, Buffer.from('audio-data'));

  await harness.service.deleteForUser(userId, orgId, bizId, cloneId);
  assert.equal(harness.cloneRows.length, 0);
  assert.equal(harness.storage.has(storageKey), false);
});
