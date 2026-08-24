const assert = require('node:assert/strict');
const test = require('node:test');
const { AppService } = require('../../dist/app.service');

test('AppService returns the EaziAiCall service identity', () => {
  assert.deepEqual(new AppService().getServiceInfo(), {
    name: 'EaziAiCall',
    status: 'ok',
    apiVersion: 'v1',
  });
});
