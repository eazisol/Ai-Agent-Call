const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertCallCan,
  canViewProviderLinks,
} = require('../../dist/modules/calls/call-permissions');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('all organization roles can list and view calls', () => {
  for (const role of ['owner', 'admin', 'manager', 'viewer']) {
    assert.doesNotThrow(() => assertCallCan(role, 'list_calls'));
    assert.doesNotThrow(() => assertCallCan(role, 'view_call'));
  }
});

test('canViewProviderLinks allows owner admin manager only', () => {
  assert.equal(canViewProviderLinks('owner'), true);
  assert.equal(canViewProviderLinks('admin'), true);
  assert.equal(canViewProviderLinks('manager'), true);
  assert.equal(canViewProviderLinks('viewer'), false);
});

test('assertCallCan rejects unknown roles', () => {
  assert.throws(
    () => assertCallCan('guest', 'list_calls'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});
