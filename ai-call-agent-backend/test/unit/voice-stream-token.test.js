const assert = require('node:assert/strict');
const test = require('node:test');
const {
  VoiceStreamTokenService,
} = require('../../dist/modules/voice-stream/voice-stream-token.service');

const values = {
  'voiceStream.signingSecret':
    'test-signing-secret-with-at-least-32-characters',
  'voiceStream.tokenTtlSeconds': 120,
};
const config = {
  get: (key) => values[key],
  getOrThrow: (key) => values[key],
};
const service = new VoiceStreamTokenService(config);

test('stream token is accepted only for its bound call', () => {
  const token = service.create('CA123');
  assert.equal(service.verify(token, 'CA123'), true);
  assert.equal(service.verify(token, 'CA999'), false);
});

test('modified stream token is rejected', () => {
  const token = service.create('CA123');
  assert.equal(service.verify(`${token}x`, 'CA123'), false);
});
