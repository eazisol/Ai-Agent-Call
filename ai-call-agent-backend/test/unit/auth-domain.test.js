const assert = require('node:assert/strict');
const test = require('node:test');
const {
  AuthTokenService,
} = require('../../dist/modules/auth/auth-token.service');
const { PasswordService } = require('../../dist/modules/auth/password.service');

const configValues = {
  'auth.jwtAccessSecret': 'test-auth-jwt-access-secret-32chars-min',
  'auth.accessTtlSeconds': 900,
  'auth.refreshTtlSeconds': 2592000,
  'auth.verificationTtlSeconds': 86400,
  'auth.resetTtlSeconds': 3600,
  'auth.bcryptRounds': 10,
};

const config = {
  get: (key) => configValues[key],
  getOrThrow: (key) => {
    if (configValues[key] === undefined) {
      throw new Error(`missing ${key}`);
    }
    return configValues[key];
  },
};

test('access tokens round-trip user identity', () => {
  const tokens = new AuthTokenService(config);
  const accessToken = tokens.createAccessToken({
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
  });
  const payload = tokens.verifyAccessToken(accessToken);
  assert.equal(payload.sub, '11111111-1111-4111-8111-111111111111');
  assert.equal(payload.email, 'user@example.com');
});

test('opaque token hashes are stable and non-reversible length', () => {
  const tokens = new AuthTokenService(config);
  const raw = tokens.createOpaqueToken();
  const hash = tokens.hashOpaqueToken(raw);
  assert.equal(hash.length, 64);
  assert.equal(tokens.hashOpaqueToken(raw), hash);
  assert.notEqual(hash, raw);
});

test('password hashing verifies matching secrets only', async () => {
  const passwords = new PasswordService(config);
  const hash = await passwords.hash('correct-horse-battery');
  assert.equal(await passwords.verify('correct-horse-battery', hash), true);
  assert.equal(await passwords.verify('wrong-password', hash), false);
});

test('password policy rejects short secrets', async () => {
  const passwords = new PasswordService(config);
  await assert.rejects(() => passwords.hash('short'), /8 and 128/);
});
