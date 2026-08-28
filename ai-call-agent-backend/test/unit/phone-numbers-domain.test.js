const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertPhoneNumberCan,
  canPhoneNumberAction,
  canViewProviderNumberId,
} = require('../../dist/modules/phone-numbers/phone-number-permissions');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('viewer can list and view phone numbers but not mutate inventory', () => {
  assert.doesNotThrow(() => assertPhoneNumberCan('viewer', 'list_phone_numbers'));
  assert.doesNotThrow(() => assertPhoneNumberCan('viewer', 'view_phone_number'));
  assert.equal(canPhoneNumberAction('viewer', 'purchase_phone_number'), false);
  assert.equal(canPhoneNumberAction('viewer', 'assign_phone_number'), false);
  assert.throws(
    () => assertPhoneNumberCan('viewer', 'purchase_phone_number'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('manager can search and assign but not purchase or release', () => {
  assert.doesNotThrow(() => assertPhoneNumberCan('manager', 'search_phone_numbers'));
  assert.doesNotThrow(() => assertPhoneNumberCan('manager', 'assign_phone_number'));
  assert.throws(
    () => assertPhoneNumberCan('manager', 'purchase_phone_number'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
  assert.throws(
    () => assertPhoneNumberCan('manager', 'release_phone_number'),
    (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
  );
});

test('owner and admin can purchase import and release', () => {
  for (const role of ['owner', 'admin']) {
    assert.doesNotThrow(() => assertPhoneNumberCan(role, 'purchase_phone_number'));
    assert.doesNotThrow(() => assertPhoneNumberCan(role, 'import_phone_number'));
    assert.doesNotThrow(() => assertPhoneNumberCan(role, 'release_phone_number'));
  }
});

test('provider number id is hidden from viewer role', () => {
  assert.equal(canViewProviderNumberId('viewer'), false);
  assert.equal(canViewProviderNumberId('manager'), true);
});
