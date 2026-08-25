const assert = require('node:assert/strict');
const test = require('node:test');
const { envValidationSchema } = require('../../dist/config/env.validation');

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'test-only',
  DATABASE_NAME: 'eazi_ai_call_test',
  TWILIO_VALIDATE_SIGNATURES: false,
  VOICE_STREAM_SIGNING_SECRET:
    'test-signing-secret-with-at-least-32-characters',
  AUTH_JWT_ACCESS_SECRET: 'test-auth-jwt-access-secret-32chars-min',
  SMTP_HOST: 'smtp.example.com',
  SMTP_FROM: 'noreply@example.com',
};

test('environment validation accepts a safe test configuration', () => {
  assert.equal(envValidationSchema.validate(validEnvironment).error, undefined);
});

test('environment validation rejects an insecure production public URL', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    NODE_ENV: 'production',
    PUBLIC_BASE_URL: 'http://example.com',
    OPENAI_API_KEY: 'test-key',
  });
  assert.match(result.error?.message ?? '', /HTTPS/);
});
