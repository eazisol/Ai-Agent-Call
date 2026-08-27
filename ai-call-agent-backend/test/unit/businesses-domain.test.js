const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  BusinessesService,
} = require('../../dist/modules/businesses/businesses.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createMemoryRepo(rows) {
  return {
    rows,
    create: (data) => ({ id: data.id ?? randomUUID(), ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id && !item.businessId) {
          item.id = randomUUID();
        }
        const key = item.id ?? item.businessId;
        const index = rows.findIndex(
          (row) => row.id === key || row.businessId === key,
        );
        if (index >= 0) {
          rows[index] = { ...rows[index], ...item };
        } else {
          rows.push({ ...item });
        }
      }
      return Array.isArray(entity) ? list : list[0];
    },
    find: async () => [],
    findOne: async () => null,
    delete: async (criteria) => {
      const id = typeof criteria === 'object' ? criteria.id : criteria;
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (rows[i].id === id || rows[i].businessId === id) {
          rows.splice(i, 1);
        }
      }
      return { affected: before - rows.length };
    },
    createQueryBuilder() {
      return {
        where() {
          return this;
        },
        getCount: async () => 0,
      };
    },
  };
}

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function hydrateBusiness(row, relations, settingsRows, hoursRows) {
  const clone = { ...row };
  if (relations?.settings) {
    clone.settings =
      settingsRows.find((item) => item.businessId === row.id) ?? null;
  }
  if (relations?.hours) {
    clone.hours = hoursRows.filter((item) => item.businessId === row.id);
  }
  return clone;
}

function createHarness(membersSeed = []) {
  const businessRows = [];
  const settingsRows = [];
  const hoursRows = [];
  const businesses = createMemoryRepo(businessRows);
  const settings = createMemoryRepo(settingsRows);
  const hours = createMemoryRepo(hoursRows);
  const calls = createMemoryRepo([]);
  const aiConfigs = createMemoryRepo([]);

  businesses.find = async ({ where = {}, relations, order } = {}) => {
    let found = businessRows.filter((row) => matchesWhere(row, where));
    if (order?.createdAt === 'ASC') {
      found = found.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return found.map((row) =>
      hydrateBusiness(row, relations, settingsRows, hoursRows),
    );
  };
  businesses.findOne = async ({ where = {}, relations } = {}) => {
    const found = businessRows.find((row) => matchesWhere(row, where));
    return found
      ? hydrateBusiness(found, relations, settingsRows, hoursRows)
      : null;
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
            if (name === 'Business') {
              if (!item.id) item.id = randomUUID();
              item.createdAt = item.createdAt ?? new Date();
              item.updatedAt = item.updatedAt ?? new Date();
              const existing = businessRows.findIndex((r) => r.id === item.id);
              if (existing >= 0) businessRows[existing] = { ...item };
              else businessRows.push({ ...item });
            } else if (name === 'BusinessSettings') {
              item.createdAt = item.createdAt ?? new Date();
              item.updatedAt = item.updatedAt ?? new Date();
              const existing = settingsRows.findIndex(
                (r) => r.businessId === item.businessId,
              );
              if (existing >= 0) settingsRows[existing] = { ...item };
              else settingsRows.push({ ...item });
            } else if (name === 'BusinessHour') {
              if (!item.id) item.id = randomUUID();
              item.createdAt = item.createdAt ?? new Date();
              item.updatedAt = item.updatedAt ?? new Date();
              hoursRows.push({ ...item });
            }
          }
          return Array.isArray(data) ? list : list[0];
        },
        findOne: async (Entity, { where }) => {
          if (Entity.name === 'BusinessSettings') {
            return (
              settingsRows.find((r) => r.businessId === where.businessId) ??
              null
            );
          }
          return null;
        },
        delete: async (Entity, criteria) => {
          if (Entity.name === 'BusinessHour') {
            for (let i = hoursRows.length - 1; i >= 0; i -= 1) {
              if (hoursRows[i].businessId === criteria.businessId) {
                hoursRows.splice(i, 1);
              }
            }
          }
        },
      };
      return work(manager);
    },
  };

  const service = new BusinessesService(
    dataSource,
    organizations,
    businesses,
    settings,
    hours,
    calls,
    aiConfigs,
  );

  return { service, businesses, settings, hours, calls, aiConfigs };
}

const baseCreate = {
  name: 'Bella Restaurant',
  industry: 'restaurant',
  email: 'hello@bella.example',
  timezone: 'America/New_York',
  defaultLanguage: 'en',
};

test('IANA timezone validation accepts America/New_York and rejects garbage', () => {
  const { service } = createHarness([]);
  assert.equal(service.isValidIanaTimezone('America/New_York'), true);
  assert.equal(service.isValidIanaTimezone('Not/A_Zone'), false);
});

test('create business under org with settings and default closed hours', async () => {
  const ownerId = randomUUID();
  const orgId = randomUUID();
  const { service, settings, hours } = createHarness([
    { userId: ownerId, organizationId: orgId, role: 'owner' },
  ]);

  const business = await service.create(ownerId, orgId, {
    ...baseCreate,
    settings: { city: 'New York', country: 'US' },
  });

  assert.equal(business.name, 'Bella Restaurant');
  assert.equal(business.organizationId, orgId);
  assert.equal(business.status, 'active');
  assert.equal(business.settings.city, 'New York');
  assert.equal(business.hours.length, 7);
  assert.equal(
    business.hours.every((hour) => hour.isClosed),
    true,
  );
  assert.equal(settings.rows.length, 1);
  assert.equal(hours.rows.length, 7);
});

test('list is org-scoped and excludes archived by default', async () => {
  const ownerId = randomUUID();
  const orgA = randomUUID();
  const orgB = randomUUID();
  const outsider = randomUUID();
  const { service } = createHarness([
    { userId: ownerId, organizationId: orgA, role: 'owner' },
    { userId: outsider, organizationId: orgB, role: 'owner' },
  ]);

  const a1 = await service.create(ownerId, orgA, {
    ...baseCreate,
    name: 'A One',
  });
  await service.create(ownerId, orgA, { ...baseCreate, name: 'A Two' });
  await service.create(outsider, orgB, { ...baseCreate, name: 'B Only' });
  await service.archiveForUser(ownerId, orgA, a1.id);

  const listed = await service.listForUser(ownerId, orgA);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].name, 'A Two');

  const withArchived = await service.listForUser(ownerId, orgA, true);
  assert.equal(withArchived.length, 2);

  const foreignId = (await service.listForUser(outsider, orgB))[0].id;
  await assert.rejects(
    () => service.getForUser(ownerId, orgA, foreignId),
    (error) =>
      error instanceof ApplicationError && error.code === 'BUSINESS_NOT_FOUND',
  );
});

test('viewer cannot create or update; manager can update but not archive', async () => {
  const ownerId = randomUUID();
  const viewerId = randomUUID();
  const managerId = randomUUID();
  const orgId = randomUUID();
  const { service } = createHarness([
    { userId: ownerId, organizationId: orgId, role: 'owner' },
    { userId: viewerId, organizationId: orgId, role: 'viewer' },
    { userId: managerId, organizationId: orgId, role: 'manager' },
  ]);

  const business = await service.create(ownerId, orgId, baseCreate);

  await assert.rejects(
    () => service.create(viewerId, orgId, baseCreate),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );

  await assert.rejects(
    () =>
      service.updateForUser(viewerId, orgId, business.id, {
        name: 'Hacked',
      }),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );

  const updated = await service.updateForUser(managerId, orgId, business.id, {
    name: 'Bella Updated',
    hours: [
      {
        dayOfWeek: 1,
        isClosed: false,
        opensAt: '09:00',
        closesAt: '17:00',
      },
    ],
  });
  assert.equal(updated.name, 'Bella Updated');
  assert.equal(updated.hours[1].opensAt, '09:00');

  await assert.rejects(
    () => service.archiveForUser(managerId, orgId, business.id),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('invalid hours and timezone are rejected', async () => {
  const ownerId = randomUUID();
  const orgId = randomUUID();
  const { service } = createHarness([
    { userId: ownerId, organizationId: orgId, role: 'owner' },
  ]);

  await assert.rejects(
    () =>
      service.create(ownerId, orgId, {
        ...baseCreate,
        timezone: 'Mars/Phobos',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_TIMEZONE',
  );

  await assert.rejects(
    () =>
      service.create(ownerId, orgId, {
        ...baseCreate,
        hours: [
          {
            dayOfWeek: 1,
            isClosed: false,
            opensAt: '17:00',
            closesAt: '09:00',
          },
        ],
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVALID_BUSINESS_HOURS',
  );
});

test('hard delete blocked when dependents exist; allowed when none', async () => {
  const ownerId = randomUUID();
  const orgId = randomUUID();
  const { service, calls, businesses } = createHarness([
    { userId: ownerId, organizationId: orgId, role: 'owner' },
  ]);

  const business = await service.create(ownerId, orgId, baseCreate);
  calls.createQueryBuilder = () => ({
    where() {
      return this;
    },
    getCount: async () => 1,
  });

  await assert.rejects(
    () => service.deleteForUser(ownerId, orgId, business.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'BUSINESS_HAS_DEPENDENTS',
  );

  calls.createQueryBuilder = () => ({
    where() {
      return this;
    },
    getCount: async () => 0,
  });

  const result = await service.deleteForUser(ownerId, orgId, business.id);
  assert.equal(result.deleted, true);
  assert.equal(
    businesses.rows.some((row) => row.id === business.id),
    false,
  );
});

test('archived business cannot be set active', async () => {
  const ownerId = randomUUID();
  const orgId = randomUUID();
  const { service } = createHarness([
    { userId: ownerId, organizationId: orgId, role: 'owner' },
  ]);
  const business = await service.create(ownerId, orgId, baseCreate);
  await service.archiveForUser(ownerId, orgId, business.id);

  await assert.rejects(
    () => service.resolveActiveForUser(ownerId, orgId, business.id),
    (error) =>
      error instanceof ApplicationError && error.code === 'BUSINESS_ARCHIVED',
  );
});
