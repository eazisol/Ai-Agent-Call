const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  TeamService,
} = require('../../dist/modules/organizations/team.service');
const {
  OrganizationsService,
} = require('../../dist/modules/organizations/organizations.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function isNullOperator(value) {
  return (
    value &&
    typeof value === 'object' &&
    (value._type === 'isNull' || value.type === 'isNull')
  );
}

function matchesWhere(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (isNullOperator(value)) {
      return row[key] == null;
    }
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
  if (relations?.invitedBy && row.invitedBy) {
    clone.invitedBy = { ...row.invitedBy };
  }
  return clone;
}

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
        item.updatedAt = new Date();
        item.createdAt = item.createdAt ?? new Date();
        if (item.user?.id) {
          item.userId = item.user.id;
        }
        if (item.organization?.id) {
          item.organizationId = item.organization.id;
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
      if (order?.createdAt === 'DESC') {
        found = found.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
      return found.map((row) => hydrate(row, relations));
    },
    findOne: async ({ where = {}, relations } = {}) => {
      const found = rows.find((row) => matchesWhere(row, where));
      return found ? hydrate(found, relations) : null;
    },
    count: async ({ where = {} } = {}) =>
      rows.filter((row) => matchesWhere(row, where)).length,
    remove: async (entity) => {
      const index = rows.findIndex((row) => row.id === entity.id);
      if (index >= 0) {
        rows.splice(index, 1);
      }
      return entity;
    },
    createQueryBuilder: (alias) => {
      const state = {
        organizationId: null,
        email: null,
        updateSet: null,
      };
      const builder = {
        innerJoinAndSelect() {
          return builder;
        },
        update() {
          return builder;
        },
        set(values) {
          state.updateSet = values;
          return builder;
        },
        where(clause, params = {}) {
          if (params.organizationId) {
            state.organizationId = params.organizationId;
          }
          if (params.email) {
            state.email = params.email;
          }
          if (clause.includes('user_id') && params.userId) {
            state.userId = params.userId;
          }
          return builder;
        },
        andWhere(clause, params = {}) {
          if (params.email) {
            state.email = params.email;
          }
          if (params.organizationId) {
            state.organizationId = params.organizationId;
          }
          return builder;
        },
        getOne: async () => {
          if (alias === 'member') {
            const found = rows.find(
              (row) =>
                row.organizationId === state.organizationId &&
                row.user?.email === state.email,
            );
            return found
              ? hydrate(found, { user: true, organization: true })
              : null;
          }
          return null;
        },
        execute: async () => {
          if (state.updateSet) {
            for (const row of rows) {
              if (
                row.organizationId === state.organizationId &&
                row.email === state.email &&
                row.consumedAt == null &&
                row.cancelledAt == null
              ) {
                Object.assign(row, state.updateSet);
              }
            }
          }
          return { affected: 0 };
        },
      };
      return builder;
    },
  };
}

function createTeamHarness(usersSeed = []) {
  const users = createMemoryRepo(usersSeed);
  const organizations = createMemoryRepo();
  const members = createMemoryRepo();
  const invitations = createMemoryRepo();
  const sentEmails = [];

  const dataSource = {
    transaction: async (work) => {
      const manager = {
        create: (_Entity, data) => ({ ...data }),
        save: async (_Entity, data) => {
          if (data.role && data.user) {
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

  const organizationsService = new OrganizationsService(
    dataSource,
    organizations,
    members,
    users,
  );

  const tokens = {
    createOpaqueToken: () => 'opaque-invite-token',
    hashOpaqueToken: (raw) => createHash('sha256').update(raw).digest('hex'),
  };

  const config = {
    get: (key) => {
      if (key === 'auth.inviteTtlSeconds') {
        return 604_800;
      }
      if (key === 'auth.publicAppUrl') {
        return 'http://localhost:3001';
      }
      return undefined;
    },
  };

  const emailDelivery = {
    providerName: 'test',
    send: async (message) => {
      sentEmails.push(message);
    },
  };

  const team = new TeamService(
    organizationsService,
    tokens,
    config,
    emailDelivery,
    members,
    invitations,
    users,
  );

  return {
    team,
    organizationsService,
    users,
    organizations,
    members,
    invitations,
    sentEmails,
  };
}

async function seedOrgWithOwner(harness, owner) {
  const org = await harness.organizationsService.create(owner.id, {
    name: 'Acme',
    slug: `acme-${owner.id.slice(0, 8)}`,
  });
  return org;
}

function addMember(harness, org, user, role) {
  const row = {
    id: randomUUID(),
    organization: harness.organizations.rows.find((item) => item.id === org.id),
    organizationId: org.id,
    user: { id: user.id, email: user.email, displayName: user.displayName },
    userId: user.id,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  harness.members.rows.push(row);
  return row;
}

test('owner invites viewer: invitation stored hashed and email sent', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const harness = createTeamHarness([owner]);
  const org = await seedOrgWithOwner(harness, owner);

  const invitation = await harness.team.createInvitation(owner.id, org.id, {
    email: 'New.User@Example.com',
    role: 'viewer',
  });

  assert.equal(invitation.email, 'new.user@example.com');
  assert.equal(invitation.role, 'viewer');
  assert.equal(harness.invitations.rows.length, 1);
  assert.equal(
    harness.invitations.rows[0].tokenHash,
    createHash('sha256').update('opaque-invite-token').digest('hex'),
  );
  assert.equal(harness.sentEmails.length, 1);
  assert.match(harness.sentEmails[0].subject, /You're invited to join/);
  assert.match(harness.sentEmails[0].text, /invitations\/accept\?token=/);
  assert.match(harness.sentEmails[0].text, /Owner invited you/);
});

test('viewer cannot invite; admin cannot invite as admin', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const viewer = {
    id: randomUUID(),
    email: 'viewer@example.com',
    displayName: 'Viewer',
  };
  const admin = {
    id: randomUUID(),
    email: 'admin@example.com',
    displayName: 'Admin',
  };
  const harness = createTeamHarness([owner, viewer, admin]);
  const org = await seedOrgWithOwner(harness, owner);
  addMember(harness, org, viewer, 'viewer');
  addMember(harness, org, admin, 'admin');

  await assert.rejects(
    () =>
      harness.team.createInvitation(viewer.id, org.id, {
        email: 'x@example.com',
        role: 'viewer',
      }),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );

  await assert.rejects(
    () =>
      harness.team.createInvitation(admin.id, org.id, {
        email: 'y@example.com',
        role: 'admin',
      }),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('invite accept creates membership; email mismatch blocked', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const invitee = {
    id: randomUUID(),
    email: 'invitee@example.com',
    displayName: 'Invitee',
  };
  const wrong = {
    id: randomUUID(),
    email: 'wrong@example.com',
    displayName: 'Wrong',
  };
  const harness = createTeamHarness([owner, invitee, wrong]);
  const org = await seedOrgWithOwner(harness, owner);

  await harness.team.createInvitation(owner.id, org.id, {
    email: invitee.email,
    role: 'manager',
  });

  await assert.rejects(
    () => harness.team.acceptInvitation(wrong.id, 'opaque-invite-token'),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVITATION_EMAIL_MISMATCH',
  );

  const accepted = await harness.team.acceptInvitation(
    invitee.id,
    'opaque-invite-token',
  );
  assert.equal(accepted.organizationId, org.id);
  assert.equal(accepted.member.role, 'manager');
  assert.equal(accepted.member.userId, invitee.id);
  assert.equal(accepted.alreadyMember, false);

  const listed = await harness.team.listMembers(owner.id, org.id);
  assert.equal(
    listed.some((member) => member.userId === invitee.id),
    true,
  );
});

test('admin cannot escalate to admin/owner; self role change blocked', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const admin = {
    id: randomUUID(),
    email: 'admin@example.com',
    displayName: 'Admin',
  };
  const viewer = {
    id: randomUUID(),
    email: 'viewer@example.com',
    displayName: 'Viewer',
  };
  const harness = createTeamHarness([owner, admin, viewer]);
  const org = await seedOrgWithOwner(harness, owner);
  const adminMember = addMember(harness, org, admin, 'admin');
  const viewerMember = addMember(harness, org, viewer, 'viewer');

  await assert.rejects(
    () =>
      harness.team.changeMemberRole(admin.id, org.id, viewerMember.id, 'admin'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );

  await assert.rejects(
    () =>
      harness.team.changeMemberRole(admin.id, org.id, adminMember.id, 'viewer'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );

  const updated = await harness.team.changeMemberRole(
    owner.id,
    org.id,
    viewerMember.id,
    'manager',
  );
  assert.equal(updated.role, 'manager');
});

test('cannot remove last owner; transfer then remove previous owner works', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const manager = {
    id: randomUUID(),
    email: 'manager@example.com',
    displayName: 'Manager',
  };
  const harness = createTeamHarness([owner, manager]);
  const org = await seedOrgWithOwner(harness, owner);
  const ownerMember = harness.members.rows.find(
    (row) => row.userId === owner.id,
  );
  const managerMember = addMember(harness, org, manager, 'manager');

  await assert.rejects(
    () => harness.team.removeMember(owner.id, org.id, ownerMember.id),
    (error) => error instanceof ApplicationError && error.code === 'LAST_OWNER',
  );

  const transfer = await harness.team.transferOwnership(
    owner.id,
    org.id,
    managerMember.id,
  );
  assert.equal(transfer.newOwner.role, 'owner');
  assert.equal(transfer.previousOwner.role, 'admin');

  await harness.team.removeMember(
    manager.id,
    org.id,
    transfer.previousOwner.id,
  );
  const remaining = await harness.team.listMembers(manager.id, org.id);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].userId, manager.id);
});

test('removed member loses tenant access; cross-tenant isolation', async () => {
  const ownerA = {
    id: randomUUID(),
    email: 'a@example.com',
    displayName: 'A',
  };
  const ownerB = {
    id: randomUUID(),
    email: 'b@example.com',
    displayName: 'B',
  };
  const member = {
    id: randomUUID(),
    email: 'm@example.com',
    displayName: 'M',
  };
  const harness = createTeamHarness([ownerA, ownerB, member]);
  const orgA = await seedOrgWithOwner(harness, ownerA);
  const orgB = await seedOrgWithOwner(harness, ownerB);
  const membership = addMember(harness, orgA, member, 'viewer');

  await assert.rejects(
    () => harness.team.listMembers(member.id, orgB.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );

  await harness.team.removeMember(ownerA.id, orgA.id, membership.id);

  await assert.rejects(
    () => harness.team.listMembers(member.id, orgA.id),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'ORGANIZATION_NOT_FOUND',
  );

  const stillB = await harness.team.listMembers(ownerB.id, orgB.id);
  assert.equal(stillB.length, 1);
});

test('viewer cannot list invitations or change roles', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const viewer = {
    id: randomUUID(),
    email: 'viewer@example.com',
    displayName: 'Viewer',
  };
  const harness = createTeamHarness([owner, viewer]);
  const org = await seedOrgWithOwner(harness, owner);
  const viewerMember = addMember(harness, org, viewer, 'viewer');

  await assert.rejects(
    () => harness.team.listInvitations(viewer.id, org.id),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
  await assert.rejects(
    () =>
      harness.team.changeMemberRole(
        viewer.id,
        org.id,
        viewerMember.id,
        'manager',
      ),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('preview reports accountState and invite statuses without enumeration on invalid token', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const existing = {
    id: randomUUID(),
    email: 'existing@example.com',
    displayName: 'Existing',
  };
  const harness = createTeamHarness([owner, existing]);
  const org = await seedOrgWithOwner(harness, owner);

  await harness.team.createInvitation(owner.id, org.id, {
    email: existing.email,
    role: 'viewer',
  });

  const previewExisting = await harness.team.previewInvitation(
    'opaque-invite-token',
  );
  assert.equal(previewExisting.status, 'valid');
  assert.equal(previewExisting.accountState, 'existing');
  assert.equal(previewExisting.invitedEmail, existing.email);
  assert.equal(previewExisting.invitedByDisplayName, 'Owner');

  const invalid = await harness.team.previewInvitation('not-a-real-token');
  assert.equal(invalid.status, 'invalid');
  assert.equal(invalid.accountState, null);
  assert.equal(invalid.invitedEmail, null);
});

test('expired cancelled and consumed invites are rejected on accept', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const invitee = {
    id: randomUUID(),
    email: 'invitee@example.com',
    displayName: 'Invitee',
  };
  const harness = createTeamHarness([owner, invitee]);
  const org = await seedOrgWithOwner(harness, owner);

  await harness.team.createInvitation(owner.id, org.id, {
    email: invitee.email,
    role: 'viewer',
  });
  harness.invitations.rows[0].expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(
    () => harness.team.acceptInvitation(invitee.id, 'opaque-invite-token'),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVITATION_EXPIRED',
  );

  harness.invitations.rows[0].expiresAt = new Date(Date.now() + 86_400_000);
  harness.invitations.rows[0].cancelledAt = new Date();
  await assert.rejects(
    () => harness.team.acceptInvitation(invitee.id, 'opaque-invite-token'),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVITATION_CANCELLED',
  );

  harness.invitations.rows[0].cancelledAt = null;
  harness.invitations.rows[0].consumedAt = new Date();
  await assert.rejects(
    () => harness.team.acceptInvitation(invitee.id, 'opaque-invite-token'),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVITATION_ALREADY_ACCEPTED',
  );

  harness.invitations.rows[0].consumedAt = null;
  const first = await harness.team.acceptInvitation(
    invitee.id,
    'opaque-invite-token',
  );
  assert.equal(first.alreadyMember, false);
  await assert.rejects(
    () => harness.team.acceptInvitation(invitee.id, 'opaque-invite-token'),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVITATION_ALREADY_ACCEPTED',
  );
});

test('duplicate accept while already a member does not create a second membership', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const invitee = {
    id: randomUUID(),
    email: 'member@example.com',
    displayName: 'Member',
  };
  const harness = createTeamHarness([owner, invitee]);
  const org = await seedOrgWithOwner(harness, owner);
  addMember(harness, org, invitee, 'viewer');

  harness.invitations.rows.push({
    id: randomUUID(),
    organization: harness.organizations.rows[0],
    organizationId: org.id,
    email: invitee.email,
    role: 'manager',
    tokenHash: createHash('sha256').update('opaque-invite-token').digest('hex'),
    invitedBy: owner,
    expiresAt: new Date(Date.now() + 86_400_000),
    consumedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const before = harness.members.rows.length;
  const result = await harness.team.acceptInvitation(
    invitee.id,
    'opaque-invite-token',
  );
  assert.equal(result.alreadyMember, true);
  assert.equal(harness.members.rows.length, before);
  assert.ok(harness.invitations.rows[0].consumedAt);
});

test('owner role cannot be invited', async () => {
  const owner = {
    id: randomUUID(),
    email: 'owner@example.com',
    displayName: 'Owner',
  };
  const harness = createTeamHarness([owner]);
  const org = await seedOrgWithOwner(harness, owner);
  await assert.rejects(
    () =>
      harness.team.createInvitation(owner.id, org.id, {
        email: 'x@example.com',
        role: 'owner',
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVALID_INVITATION_ROLE',
  );
});
