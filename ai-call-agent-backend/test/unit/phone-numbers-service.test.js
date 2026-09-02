const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  PhoneNumbersService,
} = require('../../dist/modules/phone-numbers/phone-numbers.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && value.type === 'in') {
      return value.value.includes(row[key]);
    }
    if (value && typeof value === 'object' && value._type === 'in') {
      return value._value.includes(row[key]);
    }
    return row[key] === value;
  });
}

function createHarness({
  membersSeed = [],
  businessSeed = [],
  agentSeed = [],
  phoneSeed = [],
  assignmentSeed = [],
  telephonyConfigured = true,
} = {}) {
  const phoneRows = phoneSeed.map((row) => ({ ...row }));
  const assignmentRows = assignmentSeed.map((row) => ({ ...row }));
  const agentRows = agentSeed.map((row) => ({ ...row }));
  const businessRows = businessSeed.map((row) => ({ ...row }));

  const telephony = {
    providerName: 'twilio',
    isConfigured: () => telephonyConfigured,
    searchAvailableNumbers: async () => [
      {
        externalNumberId: '+14155550100',
        phoneNumber: '+14155550100',
        isoCountry: 'US',
        capabilities: { voice: true, sms: true, mms: false },
      },
    ],
    purchaseNumber: async ({ phoneNumber }) => ({
      externalNumberId: 'PN123',
      phoneNumber,
      configured: true,
    }),
    lookupProvisionedNumber: async (phoneNumber) => ({
      externalNumberId: 'PN999',
      phoneNumber,
      configured: false,
    }),
    configureNumber: async () => undefined,
    releaseNumber: async () => undefined,
    defaultWebhookUrls: () => ({
      voiceWebhookUrl:
        'https://api.example.com/api/v1/webhooks/twilio/incoming-call',
      statusCallbackUrl:
        'https://api.example.com/api/v1/webhooks/twilio/status-callback',
    }),
  };

  const telephonyMappings = {
    recordActiveMapping: async () => ({}),
  };

  const phoneNumbers = {
    create: (data) => ({ ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) item.id = randomUUID();
        item.createdAt = item.createdAt ?? new Date();
        item.updatedAt = item.updatedAt ?? new Date();
        item.capabilities = item.capabilities ?? {
          voice: true,
          sms: false,
          mms: false,
        };
        item.metadata = item.metadata ?? {};
        const index = phoneRows.findIndex((row) => row.id === item.id);
        if (index >= 0) phoneRows[index] = { ...phoneRows[index], ...item };
        else phoneRows.push({ ...item });
      }
      return Array.isArray(entity) ? list : list[0];
    },
    findOne: async ({ where = {} } = {}) =>
      phoneRows.find((row) => matchesWhere(row, where)) ?? null,
    createQueryBuilder() {
      const state = {
        businessId: null,
        status: null,
        skip: 0,
        take: 20,
      };
      return {
        leftJoinAndSelect() {
          return this;
        },
        where(_clause, params) {
          state.businessId = params.businessId;
          return this;
        },
        andWhere(_clause, params) {
          if (params?.status) state.status = params.status;
          return this;
        },
        orderBy() {
          return this;
        },
        skip(value) {
          state.skip = value;
          return this;
        },
        take(value) {
          state.take = value;
          return this;
        },
        async getManyAndCount() {
          let rows = phoneRows.filter(
            (row) => row.businessId === state.businessId,
          );
          if (state.status) {
            rows = rows.filter((row) => row.status === state.status);
          }
          const total = rows.length;
          rows = rows.slice(state.skip, state.skip + state.take);
          return [
            rows.map((row) => ({
              ...row,
              assignments: assignmentRows
                .filter(
                  (assignment) =>
                    assignment.phoneNumberId === row.id &&
                    assignment.status === 'active',
                )
                .map((assignment) => ({
                  ...assignment,
                  agent: agentRows.find(
                    (agent) => agent.id === assignment.agentId,
                  ),
                })),
            })),
            total,
          ];
        },
      };
    },
  };

  const assignments = {
    findOne: async ({ where = {}, relations } = {}) => {
      const found =
        assignmentRows.find((row) => matchesWhere(row, where)) ?? null;
      if (!found || !relations?.agent) {
        return found;
      }
      return {
        ...found,
        agent: agentRows.find((agent) => agent.id === found.agentId) ?? null,
      };
    },
    update: async (criteria, partial) => {
      for (const row of assignmentRows) {
        if (matchesWhere(row, criteria)) {
          Object.assign(row, partial);
        }
      }
    },
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
        update: async (_Entity, criteria, partial) => {
          for (const row of assignmentRows) {
            if (matchesWhere(row, criteria)) {
              Object.assign(row, partial);
            }
          }
        },
        save: async (_Entity, data) => {
          if (!data.id) data.id = randomUUID();
          data.createdAt = data.createdAt ?? new Date();
          data.updatedAt = data.updatedAt ?? new Date();
          assignmentRows.push({ ...data });
          return data;
        },
      };
      return work(manager);
    },
  };

  const service = new PhoneNumbersService(
    dataSource,
    organizations,
    telephonyMappings,
    telephony,
    phoneNumbers,
    assignments,
    agents,
    businesses,
  );

  return { service, phoneRows, assignmentRows, telephony };
}

const orgId = '11111111-1111-4111-8111-111111111111';
const bizId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherBizId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userId = '22222222-2222-4222-8222-222222222222';
const agentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const phoneId = '99999999-9999-4999-8999-999999999999';

const baseBusiness = {
  id: bizId,
  organizationId: orgId,
  status: 'active',
};

const baseAgent = {
  id: agentId,
  businessId: bizId,
  name: 'Receptionist',
  status: 'active',
};

const basePhone = {
  id: phoneId,
  businessId: bizId,
  provider: 'twilio',
  providerNumberId: 'PN123',
  phoneNumberE164: '+14155550100',
  country: 'US',
  status: 'active',
  capabilities: { voice: true, sms: false, mms: false },
  friendlyName: null,
  metadata: {},
};

const ownerMember = [{ userId, organizationId: orgId, role: 'owner' }];
const managerMember = [{ userId, organizationId: orgId, role: 'manager' }];
const viewerMember = [{ userId, organizationId: orgId, role: 'viewer' }];

test('list returns only phone numbers owned by active business', async () => {
  const { service } = createHarness({
    membersSeed: ownerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [
      basePhone,
      {
        ...basePhone,
        id: randomUUID(),
        businessId: otherBizId,
        phoneNumberE164: '+14155550200',
      },
    ],
  });

  const result = await service.listForUser(userId, orgId, bizId);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].phoneNumberE164, '+14155550100');
});

test('cross-business phone number id returns PHONE_NUMBER_NOT_FOUND', async () => {
  const foreignPhoneId = randomUUID();
  const { service } = createHarness({
    membersSeed: ownerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [{ ...basePhone, id: foreignPhoneId, businessId: otherBizId }],
  });

  await assert.rejects(
    () =>
      service.assignForUser(userId, orgId, bizId, foreignPhoneId, { agentId }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PHONE_NUMBER_NOT_FOUND',
  );
});

test('manager cannot purchase phone numbers', async () => {
  const { service } = createHarness({
    membersSeed: managerMember,
    businessSeed: [baseBusiness],
  });

  await assert.rejects(
    () =>
      service.purchaseForUser(userId, orgId, bizId, {
        phoneNumber: '+14155550100',
        confirm: true,
      }),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('purchase requires confirm flag', async () => {
  const { service } = createHarness({
    membersSeed: ownerMember,
    businessSeed: [baseBusiness],
  });

  await assert.rejects(
    () =>
      service.purchaseForUser(userId, orgId, bizId, {
        phoneNumber: '+14155550100',
        confirm: false,
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'CONFIRMATION_REQUIRED',
  );
});

test('search purchase assign flow succeeds for owner', async () => {
  const { service, phoneRows, assignmentRows } = createHarness({
    membersSeed: ownerMember,
    businessSeed: [baseBusiness],
    agentSeed: [baseAgent],
  });

  const search = await service.searchForUser(userId, orgId, bizId, {
    isoCountry: 'US',
    areaCode: '415',
  });
  assert.equal(search.candidates.length, 1);

  const purchased = await service.purchaseForUser(userId, orgId, bizId, {
    phoneNumber: search.candidates[0].phoneNumber,
    confirm: true,
  });
  assert.equal(purchased.phoneNumber.status, 'active');
  assert.equal(phoneRows.length, 1);

  const assigned = await service.assignForUser(
    userId,
    orgId,
    bizId,
    purchased.phoneNumber.id,
    { agentId },
  );
  assert.equal(assigned.assignment.agentId, agentId);
  assert.equal(
    assignmentRows.filter((row) => row.status === 'active').length,
    1,
  );
});

test('unassign is idempotent when no active assignment exists', async () => {
  const { service } = createHarness({
    membersSeed: managerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [basePhone],
  });

  const first = await service.unassignForUser(userId, orgId, bizId, phoneId);
  const second = await service.unassignForUser(userId, orgId, bizId, phoneId);
  assert.equal(first.assignment, null);
  assert.equal(second.assignment, null);
});

test('release requires confirm flag', async () => {
  const { service } = createHarness({
    membersSeed: ownerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [basePhone],
  });

  await assert.rejects(
    () =>
      service.releaseForUser(userId, orgId, bizId, phoneId, { confirm: false }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'CONFIRMATION_REQUIRED',
  );
});

test('release blocks when assigned unless unassignFirst is set', async () => {
  const assignmentId = randomUUID();
  const { service } = createHarness({
    membersSeed: ownerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [basePhone],
    assignmentSeed: [
      {
        id: assignmentId,
        phoneNumberId: phoneId,
        agentId,
        status: 'active',
        assignedAt: new Date(),
      },
    ],
  });

  await assert.rejects(
    () =>
      service.releaseForUser(userId, orgId, bizId, phoneId, { confirm: true }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PHONE_NUMBER_HAS_ASSIGNMENT',
  );

  const released = await service.releaseForUser(userId, orgId, bizId, phoneId, {
    confirm: true,
    unassignFirst: true,
  });
  assert.equal(released.status, 'released');
});

test('viewer cannot assign phone numbers', async () => {
  const { service } = createHarness({
    membersSeed: viewerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [basePhone],
    agentSeed: [baseAgent],
  });

  await assert.rejects(
    () => service.assignForUser(userId, orgId, bizId, phoneId, { agentId }),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('search fails when telephony provider is not configured', async () => {
  const { service } = createHarness({
    membersSeed: managerMember,
    businessSeed: [baseBusiness],
    telephonyConfigured: false,
  });

  await assert.rejects(
    () =>
      service.searchForUser(userId, orgId, bizId, {
        isoCountry: 'US',
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PROVIDER_NOT_CONFIGURED',
  );
});

test('viewer responses omit providerNumberId', async () => {
  const { service } = createHarness({
    membersSeed: viewerMember,
    businessSeed: [baseBusiness],
    phoneSeed: [basePhone],
  });

  const result = await service.listForUser(userId, orgId, bizId);
  assert.equal(result.items[0].providerNumberId, undefined);
});
