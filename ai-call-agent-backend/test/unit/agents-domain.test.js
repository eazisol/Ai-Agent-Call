const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  AgentsService,
} = require('../../dist/modules/agents/agents.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function createHarness({
  membersSeed = [],
  businessSeed = [],
} = {}) {
  const agentRows = [];
  const configRows = [];
  const promptRows = [];
  const businessRows = [...businessSeed];

  const agents = {
    rows: agentRows,
    create: (data) => ({ id: data.id ?? randomUUID(), ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) item.id = randomUUID();
        item.createdAt = item.createdAt ?? new Date();
        item.updatedAt = item.updatedAt ?? new Date();
        const index = agentRows.findIndex((row) => row.id === item.id);
        if (index >= 0) agentRows[index] = { ...agentRows[index], ...item };
        else agentRows.push({ ...item });
      }
      return Array.isArray(entity) ? list : list[0];
    },
    findOne: async ({ where = {}, relations } = {}) => {
      const found = agentRows.find((row) => matchesWhere(row, where));
      if (!found) return null;
      const clone = { ...found };
      if (relations?.config) {
        clone.config =
          configRows.find((row) => row.agentId === found.id) ?? null;
      }
      if (relations?.prompts) {
        clone.prompts =
          promptRows.find((row) => row.agentId === found.id) ?? null;
      }
      return clone;
    },
    delete: async (criteria) => {
      const id = criteria.id;
      const before = agentRows.length;
      for (let i = agentRows.length - 1; i >= 0; i -= 1) {
        if (agentRows[i].id === id) agentRows.splice(i, 1);
      }
      for (let i = configRows.length - 1; i >= 0; i -= 1) {
        if (configRows[i].agentId === id) configRows.splice(i, 1);
      }
      for (let i = promptRows.length - 1; i >= 0; i -= 1) {
        if (promptRows[i].agentId === id) promptRows.splice(i, 1);
      }
      return { affected: before - agentRows.length };
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
          return agentRows
            .filter((row) => row.businessId === state.whereBusinessId)
            .filter((row) =>
              state.excludeArchived ? row.status !== 'archived' : true,
            )
            .map((row) => ({
              ...row,
              config: configRows.find((c) => c.agentId === row.id) ?? null,
              prompts: promptRows.find((p) => p.agentId === row.id) ?? null,
            }));
        },
      };
    },
  };

  const businesses = {
    findOne: async ({ where = {} } = {}) => {
      return businessRows.find((row) => matchesWhere(row, where)) ?? null;
    },
  };

  const organizations = {
    requireMembership: async (userId, organizationId) => {
      const membership = membersSeed.find(
        (row) =>
          row.userId === userId && row.organizationId === organizationId,
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
        save: async (Entity, data) => {
          const list = Array.isArray(data) ? data : [data];
          const name = Entity.name;
          for (const item of list) {
            if (name === 'Agent') {
              if (!item.id) item.id = randomUUID();
              item.createdAt = item.createdAt ?? new Date();
              item.updatedAt = item.updatedAt ?? new Date();
              const existing = agentRows.findIndex((r) => r.id === item.id);
              if (existing >= 0) agentRows[existing] = { ...item };
              else agentRows.push({ ...item });
            } else if (name === 'AgentConfig') {
              item.createdAt = item.createdAt ?? new Date();
              item.updatedAt = item.updatedAt ?? new Date();
              const existing = configRows.findIndex(
                (r) => r.agentId === item.agentId,
              );
              if (existing >= 0) configRows[existing] = { ...item };
              else configRows.push({ ...item });
            } else if (name === 'AgentPrompt') {
              item.createdAt = item.createdAt ?? new Date();
              item.updatedAt = item.updatedAt ?? new Date();
              const existing = promptRows.findIndex(
                (r) => r.agentId === item.agentId,
              );
              if (existing >= 0) promptRows[existing] = { ...item };
              else promptRows.push({ ...item });
            }
          }
          return Array.isArray(data) ? list : list[0];
        },
      };
      return work(manager);
    },
  };

  const service = new AgentsService(
    dataSource,
    organizations,
    agents,
    businesses,
  );

  return { service, agentRows, configRows, promptRows };
}

const orgId = '11111111-1111-4111-8111-111111111111';
const bizId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId = '22222222-2222-4222-8222-222222222222';

const baseBusiness = {
  id: bizId,
  organizationId: orgId,
  status: 'active',
  defaultLanguage: 'en',
  languages: ['en'],
  languageDetectionEnabled: false,
  languageSwitchingEnabled: false,
};

const baseCreate = {
  name: 'Front Desk',
  roleLabel: 'Receptionist',
  greeting: 'Thanks for calling.',
  instructions: 'Answer FAQs politely.',
  language: 'en',
};

test('create agent under active business for manager', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'manager' }],
    businessSeed: [baseBusiness],
  });

  const agent = await service.create(userId, orgId, bizId, baseCreate);
  assert.equal(agent.name, 'Front Desk');
  assert.equal(agent.status, 'active');
  assert.equal(agent.roleLabel, 'Receptionist');
  assert.equal(agent.businessId, bizId);
  assert.equal(agent.language, 'en');
  assert.deepEqual(agent.languages, ['en']);
  assert.equal(agent.languageDetectionEnabled, false);
  assert.equal(agent.escalationEnabled, false);
});

test('viewer cannot create agent', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'viewer' }],
    businessSeed: [baseBusiness],
  });

  await assert.rejects(
    () => service.create(userId, orgId, bizId, baseCreate),
    (error) =>
      error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('missing business cookie context yields ACTIVE_BUSINESS_REQUIRED', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [],
  });

  await assert.rejects(
    () => service.create(userId, orgId, bizId, baseCreate),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ACTIVE_BUSINESS_REQUIRED',
  );
});

test('list excludes archived unless includeArchived', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [baseBusiness],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  await service.archiveForUser(userId, orgId, bizId, created.id);

  const listed = await service.listForUser(userId, orgId, bizId, false);
  assert.equal(listed.length, 0);

  const withArchived = await service.listForUser(userId, orgId, bizId, true);
  assert.equal(withArchived.length, 1);
  assert.equal(withArchived[0].status, 'archived');
});

test('activate/deactivate and AGENT_ARCHIVED', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'admin' }],
    businessSeed: [baseBusiness],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  const inactive = await service.deactivateForUser(
    userId,
    orgId,
    bizId,
    created.id,
  );
  assert.equal(inactive.status, 'inactive');

  const active = await service.activateForUser(
    userId,
    orgId,
    bizId,
    created.id,
  );
  assert.equal(active.status, 'active');

  await service.archiveForUser(userId, orgId, bizId, created.id);
  await assert.rejects(
    () => service.activateForUser(userId, orgId, bizId, created.id),
    (error) =>
      error instanceof ApplicationError && error.code === 'AGENT_ARCHIVED',
  );
});

test('cross-business agent id returns AGENT_NOT_FOUND', async () => {
  const otherBiz = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      baseBusiness,
      {
        id: otherBiz,
        organizationId: orgId,
        status: 'active',
        defaultLanguage: 'en',
        languages: ['en'],
        languageDetectionEnabled: false,
        languageSwitchingEnabled: false,
      },
    ],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  await assert.rejects(
    () => service.getForUser(userId, orgId, otherBiz, created.id),
    (error) =>
      error instanceof ApplicationError && error.code === 'AGENT_NOT_FOUND',
  );
});

test('update behavior fields', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'manager' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'es'],
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  const updated = await service.updateForUser(
    userId,
    orgId,
    bizId,
    created.id,
    {
      greeting: 'Hello, how can I help?',
      instructions: 'Be brief.',
      escalationEnabled: true,
      escalationKeywords: ['manager', 'human'],
      useBusinessLanguageSettings: false,
      languageMode: 'single',
      language: 'es',
      voicePreference: 'female',
    },
  );

  assert.equal(updated.greeting, 'Hello, how can I help?');
  assert.equal(updated.instructions, 'Be brief.');
  assert.equal(updated.escalationEnabled, true);
  assert.deepEqual(updated.escalationKeywords, ['manager', 'human']);
  assert.equal(updated.language, 'es');
  assert.equal(updated.languageMode, 'single');
  assert.equal(updated.voicePreference, 'female');
  assert.equal(updated.useBusinessLanguageSettings, false);
});

test('manager cannot archive', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'manager' }],
    businessSeed: [baseBusiness],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  await assert.rejects(
    () => service.archiveForUser(userId, orgId, bizId, created.id),
    (error) =>
      error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('hard delete removes agent', async () => {
  const { service, agentRows } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [baseBusiness],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  const result = await service.deleteForUser(
    userId,
    orgId,
    bizId,
    created.id,
  );
  assert.deepEqual(result, { deleted: true });
  assert.equal(agentRows.length, 0);
});

test('create inherits business languages by default', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'ur', 'fr'],
        defaultLanguage: 'ur',
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  const agent = await service.create(userId, orgId, bizId, {
    name: 'Inherited',
    roleLabel: 'Receptionist',
    greeting: 'Hello',
    instructions: 'Help callers.',
  });
  assert.equal(agent.useBusinessLanguageSettings, true);
  assert.equal(agent.languageMode, 'multilingual');
  assert.equal(agent.language, 'ur');
  assert.deepEqual(agent.languages, ['en', 'ur', 'fr']);
  assert.equal(agent.languageDetectionEnabled, true);
  assert.equal(agent.languageSwitchingEnabled, true);
  assert.equal(agent.voicePreference, 'neutral');
});

test('agent customizes subset of business languages', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'fr', 'ar', 'ur'],
        defaultLanguage: 'en',
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  const agent = await service.create(userId, orgId, bizId, {
    name: 'Subset',
    roleLabel: 'Receptionist',
    greeting: 'Hello',
    instructions: 'Help callers.',
    useBusinessLanguageSettings: false,
    languageMode: 'multilingual',
    languages: ['en', 'ur'],
    language: 'en',
    languageDetectionEnabled: true,
    languageSwitchingEnabled: true,
    voicePreference: 'male',
  });
  assert.equal(agent.useBusinessLanguageSettings, false);
  assert.deepEqual(agent.languages, ['en', 'ur']);
  assert.equal(agent.voicePreference, 'male');
});

test('agent rejects language outside business support', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'fr'],
        defaultLanguage: 'en',
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.create(userId, orgId, bizId, {
        name: 'Bad Lang',
        roleLabel: 'Receptionist',
        greeting: 'Hello',
        instructions: 'Help.',
        useBusinessLanguageSettings: false,
        languageMode: 'single',
        language: 'ur',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_LANGUAGE',
  );
});

test('single-language mode disables detection and switching', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'es'],
        defaultLanguage: 'en',
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.create(userId, orgId, bizId, {
        name: 'Single Bad',
        roleLabel: 'Receptionist',
        greeting: 'Hello',
        instructions: 'Help.',
        useBusinessLanguageSettings: false,
        languageMode: 'single',
        language: 'en',
        languageDetectionEnabled: true,
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_LANGUAGE',
  );

  const agent = await service.create(userId, orgId, bizId, {
    name: 'Single Ok',
    roleLabel: 'Receptionist',
    greeting: 'Hello',
    instructions: 'Help.',
    useBusinessLanguageSettings: false,
    languageMode: 'single',
    language: 'es',
  });
  assert.equal(agent.languageMode, 'single');
  assert.deepEqual(agent.languages, ['es']);
  assert.equal(agent.languageDetectionEnabled, false);
  assert.equal(agent.languageSwitchingEnabled, false);
});

test('multilingual switching requires detection', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'ur'],
        defaultLanguage: 'en',
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.create(userId, orgId, bizId, {
        name: 'Switch Bad',
        roleLabel: 'Receptionist',
        greeting: 'Hello',
        instructions: 'Help.',
        useBusinessLanguageSettings: false,
        languageMode: 'multilingual',
        languages: ['en', 'ur'],
        language: 'en',
        languageDetectionEnabled: false,
        languageSwitchingEnabled: true,
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_LANGUAGE',
  );
});

test('rejects invalid catalogue language code', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'owner' }],
    businessSeed: [
      {
        ...baseBusiness,
        languages: ['en', 'es'],
        defaultLanguage: 'en',
        languageDetectionEnabled: true,
        languageSwitchingEnabled: true,
      },
    ],
  });

  await assert.rejects(
    () =>
      service.create(userId, orgId, bizId, {
        name: 'Invalid Code',
        roleLabel: 'Receptionist',
        greeting: 'Hello',
        instructions: 'Help.',
        useBusinessLanguageSettings: false,
        languageMode: 'single',
        language: 'xx',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_LANGUAGE',
  );
});

test('voice preference persists on update', async () => {
  const { service } = createHarness({
    membersSeed: [{ userId, organizationId: orgId, role: 'manager' }],
    businessSeed: [baseBusiness],
  });
  const created = await service.create(userId, orgId, bizId, baseCreate);
  const updated = await service.updateForUser(
    userId,
    orgId,
    bizId,
    created.id,
    { voicePreference: 'female' },
  );
  assert.equal(updated.voicePreference, 'female');
});

test('viewer can list/view but cannot update or activate', async () => {
  const viewerId = '33333333-3333-4333-8333-333333333333';
  const { service } = createHarness({
    membersSeed: [
      { userId, organizationId: orgId, role: 'owner' },
      { userId: viewerId, organizationId: orgId, role: 'viewer' },
    ],
    businessSeed: [baseBusiness],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);
  const listed = await service.listForUser(viewerId, orgId, bizId, false);
  assert.equal(listed.length, 1);
  const viewed = await service.getForUser(
    viewerId,
    orgId,
    bizId,
    created.id,
  );
  assert.equal(viewed.id, created.id);

  await assert.rejects(
    () =>
      service.updateForUser(viewerId, orgId, bizId, created.id, {
        greeting: 'Nope',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
  await assert.rejects(
    () => service.deactivateForUser(viewerId, orgId, bizId, created.id),
    (error) =>
      error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('cross-organization membership cannot access foreign org agents', async () => {
  const otherOrg = '99999999-9999-4999-8999-999999999999';
  const outsider = '44444444-4444-4444-8444-444444444444';
  const { service } = createHarness({
    membersSeed: [
      { userId, organizationId: orgId, role: 'owner' },
      { userId: outsider, organizationId: otherOrg, role: 'owner' },
    ],
    businessSeed: [baseBusiness],
  });

  const created = await service.create(userId, orgId, bizId, baseCreate);

  await assert.rejects(
    () => service.listForUser(outsider, orgId, bizId, false),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
  await assert.rejects(
    () => service.getForUser(outsider, orgId, bizId, created.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
  await assert.rejects(
    () =>
      service.create(outsider, orgId, bizId, {
        ...baseCreate,
        name: 'Intruder',
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
});
