const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  KnowledgeService,
} = require('../../dist/modules/knowledge/knowledge.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function createHarness({
  membersSeed = [],
  businessSeed = [],
  agentSeed = [],
  storageEnabled = false,
  providerConfigured = false,
} = {}) {
  const sourceRows = [];
  const assignmentRows = [];
  const mappingRows = [];
  const businessRows = [...businessSeed];
  const agentRows = [...agentSeed];

  const sources = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) item.id = randomUUID();
        item.createdAt = item.createdAt ?? new Date();
        item.updatedAt = item.updatedAt ?? new Date();
        item.version = item.version ?? 1;
        const index = sourceRows.findIndex((row) => row.id === item.id);
        if (index >= 0) sourceRows[index] = { ...sourceRows[index], ...item };
        else sourceRows.push({ ...item });
      }
      return Array.isArray(entity) ? list : list[0];
    },
    findOne: async ({ where = {}, relations } = {}) => {
      const found = sourceRows.find((row) => matchesWhere(row, where));
      if (!found) return null;
      const clone = { ...found };
      if (relations?.providerMappings) {
        clone.providerMappings = mappingRows.filter(
          (m) => m.knowledgeSourceId === found.id,
        );
      }
      if (relations?.assignments) {
        clone.assignments = assignmentRows.filter(
          (a) => a.knowledgeSourceId === found.id,
        );
      }
      return clone;
    },
    delete: async (criteria) => {
      const id = criteria.id;
      const before = sourceRows.length;
      for (let i = sourceRows.length - 1; i >= 0; i -= 1) {
        if (sourceRows[i].id === id) sourceRows.splice(i, 1);
      }
      return { affected: before - sourceRows.length };
    },
    createQueryBuilder() {
      const state = { whereBusinessId: null, excludeArchived: false };
      return {
        leftJoinAndSelect() {
          return this;
        },
        where(_clause, params) {
          state.whereBusinessId = params.businessId;
          return this;
        },
        andWhere(_clause, params) {
          if (params?.archived === 'archived') state.excludeArchived = true;
          return this;
        },
        orderBy() {
          return this;
        },
        async getMany() {
          return sourceRows
            .filter((row) => row.businessId === state.whereBusinessId)
            .filter((row) =>
              state.excludeArchived ? row.status !== 'archived' : true,
            )
            .map((row) => ({
              ...row,
              providerMappings: mappingRows.filter(
                (m) => m.knowledgeSourceId === row.id,
              ),
              assignments: assignmentRows.filter(
                (a) => a.knowledgeSourceId === row.id,
              ),
            }));
        },
      };
    },
  };

  const assignments = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      const duplicate = assignmentRows.find(
        (row) =>
          row.agentId === entity.agentId &&
          row.knowledgeSourceId === entity.knowledgeSourceId,
      );
      if (duplicate) {
        throw new ApplicationError(
          'KNOWLEDGE_ASSIGNMENT_CONFLICT',
          'This knowledge source is already assigned to the agent.',
          409,
        );
      }
      if (!entity.id) entity.id = randomUUID();
      entity.createdAt = entity.createdAt ?? new Date();
      entity.updatedAt = entity.updatedAt ?? new Date();
      assignmentRows.push({ ...entity });
      return entity;
    },
    count: async ({ where = {} } = {}) =>
      assignmentRows.filter((row) => matchesWhere(row, where)).length,
    delete: async (criteria) => {
      const before = assignmentRows.length;
      for (let i = assignmentRows.length - 1; i >= 0; i -= 1) {
        if (matchesWhere(assignmentRows[i], criteria)) {
          assignmentRows.splice(i, 1);
        }
      }
      return { affected: before - assignmentRows.length };
    },
    createQueryBuilder() {
      const state = { agentId: null };
      return {
        innerJoinAndSelect() {
          return this;
        },
        leftJoinAndSelect() {
          return this;
        },
        where(_clause, params) {
          state.agentId = params.agentId;
          return this;
        },
        andWhere() {
          return this;
        },
        orderBy() {
          return this;
        },
        async getMany() {
          return assignmentRows
            .filter((row) => row.agentId === state.agentId)
            .map((row) => {
              const source = sourceRows.find(
                (s) => s.id === row.knowledgeSourceId,
              );
              return {
                ...row,
                knowledgeSource: {
                  ...source,
                  providerMappings: mappingRows.filter(
                    (m) => m.knowledgeSourceId === source.id,
                  ),
                  assignments: assignmentRows.filter(
                    (a) => a.knowledgeSourceId === source.id,
                  ),
                },
              };
            })
            .filter((row) => row.knowledgeSource?.status !== 'archived');
        },
      };
    },
  };

  const mappings = {
    findOne: async () => null,
  };

  const agents = {
    findOne: async ({ where = {} } = {}) =>
      agentRows.find((row) => matchesWhere(row, where)) ?? null,
  };

  const businesses = {
    findOne: async ({ where = {} } = {}) =>
      businessRows.find((row) => matchesWhere(row, where)) ?? null,
  };

  const organizations = {
    requireMembership: async (userId, organizationId) => {
      const membership = membersSeed.find(
        (row) => row.userId === userId && row.organizationId === organizationId,
      );
      if (!membership) {
        throw new ApplicationError(
          'ORGANIZATION_NOT_FOUND',
          'Organization not found.',
          404,
        );
      }
      return membership;
    },
  };

  const dataSource = {
    transaction: async (work) => {
      const manager = {
        create: (_Entity, data) => ({ ...data }),
        save: async (_Entity, data) => sources.save(data),
      };
      return work(manager);
    },
  };

  const config = {
    get: (key) => {
      if (key === 'objectStorage.enabled') return storageEnabled;
      if (key === 'knowledge.maxFileBytes') return 10 * 1024 * 1024;
      return undefined;
    },
  };

  const objectStorage = {
    putObject: async () => {
      if (!storageEnabled) {
        throw new ApplicationError(
          'OBJECT_STORAGE_NOT_CONFIGURED',
          'Object storage is not configured.',
          503,
        );
      }
    },
    getObject: async () => Buffer.from(''),
    deleteObject: async () => undefined,
    healthCheck: async () => undefined,
  };

  const knowledgeSync = {
    bestEffortRemoveRemote: async () => undefined,
    syncForUser: async () => {
      if (!providerConfigured) {
        throw new ApplicationError(
          'PROVIDER_NOT_CONFIGURED',
          'ElevenLabs is not configured on the server.',
          503,
        );
      }
      return { sync: { syncStatus: 'synced' } };
    },
  };

  const service = new KnowledgeService(
    dataSource,
    organizations,
    config,
    knowledgeSync,
    objectStorage,
    sources,
    assignments,
    mappings,
    agents,
    businesses,
  );

  return {
    service,
    sourceRows,
    assignmentRows,
    agentRows,
    knowledgeSync,
  };
}

const userId = '11111111-1111-4111-8111-111111111111';
const orgId = '22222222-2222-4222-8222-222222222222';
const bizId = '33333333-3333-4333-8333-333333333333';
const otherBizId = '44444444-4444-4444-8444-444444444444';

function baseSeeds() {
  return {
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      { id: bizId, organizationId: orgId, status: 'active' },
      { id: otherBizId, organizationId: orgId, status: 'active' },
    ],
    agentSeed: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        businessId: bizId,
        name: 'Agent A',
        status: 'active',
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        businessId: otherBizId,
        name: 'Agent B',
        status: 'active',
      },
    ],
  };
}

test('create text knowledge source', async () => {
  const { service, sourceRows } = createHarness(baseSeeds());
  const view = await service.createText(userId, orgId, bizId, {
    name: 'Hours',
    text: 'We are open 9-5.',
  });
  assert.equal(view.type, 'text');
  assert.equal(view.name, 'Hours');
  assert.equal(sourceRows.length, 1);
  assert.equal(sourceRows[0].textBody, 'We are open 9-5.');
});

test('assign knowledge to same-business agent', async () => {
  const harness = createHarness(baseSeeds());
  const source = await harness.service.createText(userId, orgId, bizId, {
    name: 'FAQ',
    text: 'Hello',
  });
  const assignment = await harness.service.assignToAgent(
    userId,
    orgId,
    bizId,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    source.id,
  );
  assert.equal(assignment.agentId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(assignment.knowledge.id, source.id);
  assert.equal(harness.assignmentRows.length, 1);
});

test('cross-business assign is blocked', async () => {
  const harness = createHarness(baseSeeds());
  const source = await harness.service.createText(userId, orgId, bizId, {
    name: 'Shared',
    text: 'Body',
  });
  await assert.rejects(
    () =>
      harness.service.assignToAgent(
        userId,
        orgId,
        bizId,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        source.id,
      ),
    (error) => {
      assert.equal(error.code, 'AGENT_NOT_FOUND');
      return true;
    },
  );
});

test('delete blocked when assignments exist', async () => {
  const harness = createHarness(baseSeeds());
  const source = await harness.service.createText(userId, orgId, bizId, {
    name: 'Assigned',
    text: 'Body',
  });
  await harness.service.assignToAgent(
    userId,
    orgId,
    bizId,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    source.id,
  );
  await assert.rejects(
    () => harness.service.deleteForUser(userId, orgId, bizId, source.id),
    (error) => {
      assert.equal(error.code, 'KNOWLEDGE_HAS_ASSIGNMENTS');
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
});

test('sync not configured surfaces PROVIDER_NOT_CONFIGURED via sync service', async () => {
  const harness = createHarness({
    ...baseSeeds(),
    providerConfigured: false,
  });
  await assert.rejects(
    () =>
      harness.knowledgeSync.syncForUser(
        userId,
        orgId,
        bizId,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      ),
    (error) => {
      assert.equal(error.code, 'PROVIDER_NOT_CONFIGURED');
      return true;
    },
  );
});

test('file upload rejected when object storage disabled', async () => {
  const harness = createHarness({ ...baseSeeds(), storageEnabled: false });
  await assert.rejects(
    () =>
      harness.service.createFile(
        userId,
        orgId,
        bizId,
        {
          buffer: Buffer.from('hello'),
          originalname: 'notes.txt',
          mimetype: 'text/plain',
          size: 5,
        },
        'Notes',
      ),
    (error) => {
      assert.equal(error.code, 'OBJECT_STORAGE_NOT_CONFIGURED');
      assert.equal(error.statusCode, 503);
      return true;
    },
  );
});
