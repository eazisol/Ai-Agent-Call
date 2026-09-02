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
    ELEVENLABS_WEBHOOK_SECRET: 'production-webhook-secret',
  });
  assert.match(result.error?.message ?? '', /HTTPS/);
});

test('environment validation accepts native AWS object storage without endpoint or static keys', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    OBJECT_STORAGE_ENABLED: true,
    OBJECT_STORAGE_REGION: 'us-east-1',
    OBJECT_STORAGE_BUCKET: 'eazi-production',
    OBJECT_STORAGE_ENDPOINT: '',
    OBJECT_STORAGE_ACCESS_KEY_ID: '',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: '',
  });
  assert.equal(result.error, undefined);
});

test('environment validation rejects partial object storage static credentials', () => {
  const accessOnly = envValidationSchema.validate({
    ...validEnvironment,
    OBJECT_STORAGE_ENABLED: true,
    OBJECT_STORAGE_BUCKET: 'eazi-production',
    OBJECT_STORAGE_ACCESS_KEY_ID: 'only-key',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: '',
  });
  assert.match(accessOnly.error?.message ?? '', /both be set or both omitted/i);

  const secretOnly = envValidationSchema.validate({
    ...validEnvironment,
    OBJECT_STORAGE_ENABLED: true,
    OBJECT_STORAGE_BUCKET: 'eazi-production',
    OBJECT_STORAGE_ACCESS_KEY_ID: '',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: 'only-secret',
  });
  assert.match(secretOnly.error?.message ?? '', /both be set or both omitted/i);
});

test('environment validation requires bucket when object storage is enabled', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    OBJECT_STORAGE_ENABLED: true,
    OBJECT_STORAGE_BUCKET: '',
  });
  assert.match(result.error?.message ?? '', /OBJECT_STORAGE_BUCKET/);
});

test('environment validation requires ElevenLabs webhook secret in production', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    NODE_ENV: 'production',
    PUBLIC_BASE_URL: 'https://api.example.com',
    OPENAI_API_KEY: 'test-key',
    ELEVENLABS_WEBHOOK_SECRET: '',
  });
  assert.match(result.error?.message ?? '', /ELEVENLABS_WEBHOOK_SECRET/);
});

test('environment validation accepts elevenlabs voice provider without OpenAI key in production', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    NODE_ENV: 'production',
    PUBLIC_BASE_URL: 'https://api.example.com',
    VOICE_AGENT_PROVIDER: 'elevenlabs',
    ELEVENLABS_WEBHOOK_SECRET: 'production-webhook-secret',
    OPENAI_API_KEY: '',
  });
  assert.equal(result.error, undefined);
});

test('environment validation still requires OpenAI key for openai_realtime in production', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    NODE_ENV: 'production',
    PUBLIC_BASE_URL: 'https://api.example.com',
    VOICE_AGENT_PROVIDER: 'openai_realtime',
    ELEVENLABS_WEBHOOK_SECRET: 'production-webhook-secret',
    OPENAI_API_KEY: '',
  });
  assert.match(result.error?.message ?? '', /OPENAI_API_KEY/);
});

test('object storage disabled remains valid without bucket or credentials', () => {
  const result = envValidationSchema.validate({
    ...validEnvironment,
    OBJECT_STORAGE_ENABLED: false,
    OBJECT_STORAGE_BUCKET: '',
    OBJECT_STORAGE_ACCESS_KEY_ID: '',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: '',
  });
  assert.equal(result.error, undefined);
});
