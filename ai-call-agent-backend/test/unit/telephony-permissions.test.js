const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertCanViewTelephonyProviderStatus,
} = require('../../dist/modules/twilio/telephony-permissions');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('owner and admin can view telephony provider status', () => {
  assert.doesNotThrow(() =>
    assertCanViewTelephonyProviderStatus('owner'),
  );
  assert.doesNotThrow(() => assertCanViewTelephonyProviderStatus('admin'));
});

test('manager and viewer cannot view telephony provider status', () => {
  for (const role of ['manager', 'viewer']) {
    assert.throws(
      () => assertCanViewTelephonyProviderStatus(role),
      (error) => error instanceof ApplicationError && error.code === 'FORBIDDEN',
    );
  }
});
