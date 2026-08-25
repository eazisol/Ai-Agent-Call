const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertCan,
  canAssignRole,
  canManageTarget,
  canRemoveMember,
  isInviteAssignableRole,
} = require('../../dist/modules/organizations/organization-permissions');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('permission matrix: invite and list invites are owner/admin only', () => {
  assertCan('owner', 'invite');
  assertCan('admin', 'invite');
  assert.throws(
    () => assertCan('manager', 'invite'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
  assert.throws(
    () => assertCan('viewer', 'list_invitations'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
  assertCan('viewer', 'list_members');
});

test('admin cannot assign or manage admin/owner; owner can assign non-owner', () => {
  assert.equal(canAssignRole('admin', 'viewer'), true);
  assert.equal(canAssignRole('admin', 'manager'), true);
  assert.equal(canAssignRole('admin', 'admin'), false);
  assert.equal(canAssignRole('admin', 'owner'), false);
  assert.equal(canAssignRole('owner', 'admin'), true);
  assert.equal(canAssignRole('owner', 'owner'), false);

  assert.equal(canManageTarget('admin', 'viewer'), true);
  assert.equal(canManageTarget('admin', 'admin'), false);
  assert.equal(canManageTarget('owner', 'admin'), true);
  assert.equal(canManageTarget('owner', 'owner'), false);

  assert.equal(canRemoveMember('admin', 'manager'), true);
  assert.equal(canRemoveMember('admin', 'admin'), false);
  assert.equal(canRemoveMember('owner', 'owner'), false);
});

test('inviteable roles exclude owner', () => {
  assert.equal(isInviteAssignableRole('viewer'), true);
  assert.equal(isInviteAssignableRole('owner'), false);
});
