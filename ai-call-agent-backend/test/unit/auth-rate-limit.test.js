const assert = require('node:assert/strict');
const test = require('node:test');
const {
  AuthRateLimitService,
} = require('../../dist/modules/auth/auth-rate-limit.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('auth rate limiter allows traffic under the max then blocks', () => {
  const limiter = new AuthRateLimitService({
    get: (key) => {
      if (key === 'auth.rateLimitMax') {
        return 3;
      }
      if (key === 'auth.rateLimitWindowMs') {
        return 60_000;
      }
      return undefined;
    },
  });

  limiter.consume('ip:POST:/api/v1/auth/login');
  limiter.consume('ip:POST:/api/v1/auth/login');
  limiter.consume('ip:POST:/api/v1/auth/login');

  assert.throws(
    () => limiter.consume('ip:POST:/api/v1/auth/login'),
    (error) =>
      error instanceof ApplicationError && error.code === 'RATE_LIMITED',
  );

  // Separate route bucket remains available
  limiter.consume('ip:POST:/api/v1/auth/register');
});
