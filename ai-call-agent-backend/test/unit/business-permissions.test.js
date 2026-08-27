const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertBusinessCan,
  canBusinessAction,
} = require('../../dist/modules/businesses/business-permissions');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('business permission matrix matches M04 scope', () => {
  assert.equal(canBusinessAction('viewer', 'list_businesses'), true);
  assert.equal(canBusinessAction('viewer', 'create_business'), false);
  assert.equal(canBusinessAction('manager', 'create_business'), true);
  assert.equal(canBusinessAction('manager', 'archive_business'), false);
  assert.equal(canBusinessAction('admin', 'archive_business'), true);
  assert.equal(canBusinessAction('owner', 'delete_business'), true);
});

test('assertBusinessCan throws FORBIDDEN for viewers creating', () => {
  assert.throws(
    () => assertBusinessCan('viewer', 'create_business'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});
