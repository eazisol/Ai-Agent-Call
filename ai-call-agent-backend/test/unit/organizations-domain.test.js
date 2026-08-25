const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  OrganizationsService,
} = require('../../dist/modules/organizations/organizations.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createMemoryRepo(seed = []) {
  const rows = seed.map((row) => ({ ...row }));
  return {
    rows,
    create: (data) => ({ id: data.id ?? randomUUID(), ...data }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) {
          item.id = randomUUID();
        }
        const index = rows.findIndex((row) => row.id === item.id);
        if (index >= 0) {
          rows[index] = { ...rows[index], ...item };
        } else {
          rows.push({ ...item });
        }
      }
      return Array.isArray(entity) ? list : list[0];
    },
    find: async ({ where = {}, relations, order } = {}) => {
      let found = rows.filter((row) => matchesWhere(row, where));
      if (order?.createdAt === 'ASC') {
        found = found.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      }
      return found.map((row) => hydrate(row, relations));
    },
    findOne: async ({ where = {}, relations } = {}) => {
      const found = rows.find((row) => matchesWhere(row, where));
      return found ? hydrate(found, relations) : null;
    },
  };
}

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && value.id) {
      if (key === 'user') {
        return row.userId === value.id || row.user?.id === value.id;
      }
      if (key === 'organization') {
        return (
          row.organizationId === value.id || row.organization?.id === value.id
        );
      }
    }
    return row[key] === value;
  });
}

function hydrate(row, relations) {
  const clone = { ...row };
  if (relations?.organization && row.organization) {
    clone.organization = { ...row.organization };
  }
  if (relations?.user && row.user) {
    clone.user = { ...row.user };
  }
  return clone;
}

function createHarness(usersSeed = []) {
  const users = createMemoryRepo(usersSeed);
  const organizations = createMemoryRepo();
  const members = createMemoryRepo();

  const dataSource = {
    transaction: async (work) => {
      const manager = {
        create: (_Entity, data) => ({ ...data }),
        save: async (_Entity, data) => {
          if (data.role) {
            if (!data.id) {
              data.id = randomUUID();
            }
            data.createdAt = data.createdAt ?? new Date();
            data.updatedAt = data.updatedAt ?? new Date();
            data.userId = data.user?.id;
            data.organizationId = data.organization?.id;
            members.rows.push({ ...data });
            return data;
          }
          if (!data.id) {
            data.id = randomUUID();
          }
          data.createdAt = data.createdAt ?? new Date();
          data.updatedAt = data.updatedAt ?? new Date();
          organizations.rows.push({ ...data });
          return data;
        },
      };
      return work(manager);
    },
  };

  const service = new OrganizationsService(
    dataSource,
    organizations,
    members,
    users,
  );

  return { service, users, organizations, members };
}

test('slug normalization produces URL-safe values', () => {
  const { service } = createHarness();
  assert.equal(service.normalizeSlug(' Acme Health! '), 'acme-health');
  assert.equal(service.isValidSlug('acme-health'), true);
  assert.equal(service.isValidSlug('a'), false);
});

test('create organization inserts owner membership', async () => {
  const userId = randomUUID();
  const { service, members } = createHarness([
    {
      id: userId,
      email: 'owner@example.com',
      displayName: 'Owner',
    },
  ]);

  const org = await service.create(userId, { name: 'Acme Health' });
  assert.equal(org.name, 'Acme Health');
  assert.equal(org.role, 'owner');
  assert.equal(org.slug, 'acme-health');
  assert.equal(members.rows.length, 1);
  assert.equal(members.rows[0].role, 'owner');
});

test('list and get are membership scoped; foreign org is not found', async () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const { service } = createHarness([
    { id: userA, email: 'a@example.com', displayName: 'A' },
    { id: userB, email: 'b@example.com', displayName: 'B' },
  ]);

  const orgA = await service.create(userA, { name: 'Org A', slug: 'org-a' });
  const orgB = await service.create(userB, { name: 'Org B', slug: 'org-b' });

  const listedA = await service.listForUser(userA);
  assert.equal(listedA.length, 1);
  assert.equal(listedA[0].id, orgA.id);

  await assert.rejects(
    () => service.getForUser(userA, orgB.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
});

test('non-owner cannot update organization settings', async () => {
  const ownerId = randomUUID();
  const memberId = randomUUID();
  const { service, members, organizations } = createHarness([
    { id: ownerId, email: 'owner@example.com', displayName: 'Owner' },
    { id: memberId, email: 'member@example.com', displayName: 'Member' },
  ]);

  const org = await service.create(ownerId, { name: 'Shared', slug: 'shared' });
  const organization = organizations.rows[0];
  members.rows.push({
    id: randomUUID(),
    organization,
    organizationId: org.id,
    user: { id: memberId },
    userId: memberId,
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await assert.rejects(
    () => service.updateForOwner(memberId, org.id, { name: 'Hacked' }),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );

  const updated = await service.updateForOwner(ownerId, org.id, {
    name: 'Shared Updated',
  });
  assert.equal(updated.name, 'Shared Updated');
});

test('member can read own tenant but not update another org', async () => {
  const ownerId = randomUUID();
  const memberId = randomUUID();
  const outsiderId = randomUUID();
  const { service, members, organizations } = createHarness([
    { id: ownerId, email: 'owner@example.com', displayName: 'Owner' },
    { id: memberId, email: 'member@example.com', displayName: 'Member' },
    { id: outsiderId, email: 'out@example.com', displayName: 'Out' },
  ]);

  const orgA = await service.create(ownerId, { name: 'Alpha', slug: 'alpha' });
  const orgB = await service.create(outsiderId, { name: 'Beta', slug: 'beta' });
  members.rows.push({
    id: randomUUID(),
    organization: organizations.rows.find((row) => row.id === orgA.id),
    organizationId: orgA.id,
    user: { id: memberId },
    userId: memberId,
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const own = await service.getForUser(memberId, orgA.id);
  assert.equal(own.id, orgA.id);
  assert.equal(own.role, 'member');

  await assert.rejects(
    () => service.getForUser(memberId, orgB.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
  await assert.rejects(
    () => service.updateForOwner(memberId, orgB.id, { name: 'Nope' }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
});

test('workspace switching context never exposes the other tenant', async () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const { service } = createHarness([
    { id: userA, email: 'a@example.com', displayName: 'A' },
    { id: userB, email: 'b@example.com', displayName: 'B' },
  ]);

  const orgA1 = await service.create(userA, { name: 'A One', slug: 'a-one' });
  const orgA2 = await service.create(userA, { name: 'A Two', slug: 'a-two' });
  const orgB = await service.create(userB, { name: 'B Only', slug: 'b-only' });

  const listedA = await service.listForUser(userA);
  assert.equal(listedA.length, 2);
  assert.equal(
    listedA.every((org) => org.id === orgA1.id || org.id === orgA2.id),
    true,
  );

  // Simulate switch to A Two — still cannot read B
  const active = await service.getForUser(userA, orgA2.id);
  assert.equal(active.id, orgA2.id);
  await assert.rejects(
    () => service.getForUser(userA, orgB.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );
});
