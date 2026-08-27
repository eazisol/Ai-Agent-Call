const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertAgentCan,
  canAgentAction,
} = require('../../dist/modules/agents/agent-permissions');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('viewer can list/view but cannot create or archive agents', () => {
  assert.equal(canAgentAction('viewer', 'list_agents'), true);
  assert.equal(canAgentAction('viewer', 'view_agent'), true);
  assert.equal(canAgentAction('viewer', 'create_agent'), false);
  assert.equal(canAgentAction('viewer', 'archive_agent'), false);
  assert.throws(
    () => assertAgentCan('viewer', 'create_agent'),
    (error) =>
      error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('manager can create/update/activate but cannot archive', () => {
  assert.equal(canAgentAction('manager', 'create_agent'), true);
  assert.equal(canAgentAction('manager', 'update_agent'), true);
  assert.equal(canAgentAction('manager', 'activate_agent'), true);
  assert.equal(canAgentAction('manager', 'archive_agent'), false);
  assert.throws(
    () => assertAgentCan('manager', 'delete_agent'),
    (error) =>
      error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('owner and admin can archive and delete', () => {
  assert.equal(canAgentAction('owner', 'archive_agent'), true);
  assert.equal(canAgentAction('admin', 'delete_agent'), true);
});
