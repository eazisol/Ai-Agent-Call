import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  APP_BASE_URL: Joi.string().uri().optional(),
  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),
  PROTOTYPE_API_ENABLED: Joi.boolean().default(false),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('log'),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),

  REDIS_ENABLED: Joi.boolean().default(true),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('', null),
  REDIS_CONNECT_TIMEOUT_MS: Joi.number().integer().min(100).default(1500),

  OBJECT_STORAGE_ENABLED: Joi.boolean().default(false),
  OBJECT_STORAGE_ENDPOINT: Joi.string().uri().allow('', null),
  OBJECT_STORAGE_REGION: Joi.string().default('us-east-1'),
  OBJECT_STORAGE_BUCKET: Joi.string().allow('', null),
  OBJECT_STORAGE_ACCESS_KEY_ID: Joi.string().allow('', null),
  OBJECT_STORAGE_SECRET_ACCESS_KEY: Joi.string().allow('', null),
  OBJECT_STORAGE_HEALTH_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .default(2000),

  KNOWLEDGE_MAX_FILE_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(52_428_800)
    .default(10_485_760),

  VOICE_CATALOG_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(86_400)
    .default(3600),

  VOICE_CLONE_MAX_SAMPLE_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(52_428_800)
    .default(26_214_400),

  VOICE_CLONE_MAX_SAMPLES: Joi.number().integer().min(1).max(10).default(5),

  TELEPHONY_PROVIDER: Joi.string().valid('twilio').default('twilio'),
  VOICE_AGENT_PROVIDER: Joi.string()
    .valid('openai_realtime', 'elevenlabs')
    .default('openai_realtime'),

  OPENAI_API_KEY: Joi.string().allow('', null),
  OPENAI_REALTIME_MODEL: Joi.string().default('gpt-realtime'),
  OPENAI_DEFAULT_VOICE: Joi.string().default('alloy'),
  OPENAI_DEFAULT_INSTRUCTIONS: Joi.string().max(20_000).allow('', null),

  TWILIO_ACCOUNT_SID: Joi.string().allow('', null),
  TWILIO_AUTH_TOKEN: Joi.string().allow('', null),
  TWILIO_PHONE_NUMBER: Joi.string().allow('', null),
  TWILIO_VALIDATE_SIGNATURES: Joi.boolean().default(true),

  VOICE_STREAM_SIGNING_SECRET: Joi.string().min(32).required(),
  VOICE_STREAM_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(30)
    .max(600)
    .default(120),
  VOICE_STREAM_MAX_DURATION_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(14_400)
    .default(7200),
  VOICE_STREAM_MAX_MESSAGE_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(5_242_880)
    .default(1_048_576),

  INBOUND_CALL_DEV_STREAM_FALLBACK: Joi.boolean().default(false),
  ELEVENLABS_WEBHOOK_SECRET: Joi.string().allow('', null),

  N8N_ENABLED: Joi.boolean().default(false),
  N8N_CALL_COMPLETED_WEBHOOK: Joi.string().uri().allow('', null),

  AUTH_JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  AUTH_ACCESS_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(900),
  AUTH_REFRESH_TTL_SECONDS: Joi.number()
    .integer()
    .min(3600)
    .max(31_536_000)
    .default(2_592_000),
  AUTH_VERIFICATION_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .max(604_800)
    .default(86_400),
  AUTH_RESET_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .max(86_400)
    .default(3_600),
  AUTH_INVITE_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .max(2_592_000)
    .default(604_800),
  AUTH_BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  AUTH_PUBLIC_APP_URL: Joi.string().uri().optional(),
  AUTH_ACCESS_COOKIE_NAME: Joi.string().default('eazi_access'),
  AUTH_REFRESH_COOKIE_NAME: Joi.string().default('eazi_refresh'),
  AUTH_ORG_COOKIE_NAME: Joi.string().default('eazi_org'),
  AUTH_BIZ_COOKIE_NAME: Joi.string().default('eazi_biz'),
  AUTH_COOKIE_SECURE: Joi.boolean().optional(),
  AUTH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').optional(),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().min(5).max(1000).default(20),
  AUTH_RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('', null),
  SMTP_PASSWORD: Joi.string().allow('', null),
  SMTP_FROM: Joi.string().required(),
  SMTP_TIMEOUT_MS: Joi.number().integer().min(1000).max(60_000).default(10_000),

  ELEVENLABS_API_KEY: Joi.string().allow('', null).optional(),
  ELEVENLABS_API_BASE_URL: Joi.string().uri().optional(),
  ELEVENLABS_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120_000)
    .default(20_000),
  ELEVENLABS_DEFAULT_VOICE_FEMALE: Joi.string().allow('', null).optional(),
  ELEVENLABS_DEFAULT_VOICE_MALE: Joi.string().allow('', null).optional(),
  ELEVENLABS_DEFAULT_VOICE_NEUTRAL: Joi.string().allow('', null).optional(),
})
  .custom((environment: Record<string, unknown>, helpers) => {
    const production = environment.NODE_ENV === 'production';
    const publicBaseUrl =
      typeof environment.PUBLIC_BASE_URL === 'string'
        ? environment.PUBLIC_BASE_URL
        : '';

    if (production && !publicBaseUrl.startsWith('https://')) {
      return helpers.message({
        custom: 'PUBLIC_BASE_URL must use HTTPS in production',
      });
    }

    if (
      production &&
      environment.VOICE_AGENT_PROVIDER === 'openai_realtime' &&
      !environment.OPENAI_API_KEY
    ) {
      return helpers.message({
        custom: 'OPENAI_API_KEY is required for the selected voice provider',
      });
    }

    if (
      environment.TWILIO_VALIDATE_SIGNATURES === true &&
      !environment.TWILIO_AUTH_TOKEN
    ) {
      return helpers.message({
        custom:
          'TWILIO_AUTH_TOKEN is required when signature validation is enabled',
      });
    }

    if (
      environment.OBJECT_STORAGE_ENABLED === true &&
      !environment.OBJECT_STORAGE_BUCKET
    ) {
      return helpers.message({
        custom:
          'OBJECT_STORAGE_BUCKET is required when object storage is enabled',
      });
    }

    if (environment.OBJECT_STORAGE_ENABLED === true) {
      const objectStorageAccessKeyId =
        typeof environment.OBJECT_STORAGE_ACCESS_KEY_ID === 'string'
          ? environment.OBJECT_STORAGE_ACCESS_KEY_ID.trim()
          : '';
      const objectStorageSecretAccessKey =
        typeof environment.OBJECT_STORAGE_SECRET_ACCESS_KEY === 'string'
          ? environment.OBJECT_STORAGE_SECRET_ACCESS_KEY.trim()
          : '';
      const hasObjectStorageAccessKey = Boolean(objectStorageAccessKeyId);
      const hasObjectStorageSecretKey = Boolean(objectStorageSecretAccessKey);

      if (hasObjectStorageAccessKey !== hasObjectStorageSecretKey) {
        return helpers.message({
          custom:
            'OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_SECRET_ACCESS_KEY must both be set or both omitted (omit both to use the AWS default credential chain / ECS Task Role)',
        });
      }
    }

    const elevenLabsWebhookSecret =
      typeof environment.ELEVENLABS_WEBHOOK_SECRET === 'string'
        ? environment.ELEVENLABS_WEBHOOK_SECRET.trim()
        : '';

    if (production && !elevenLabsWebhookSecret) {
      return helpers.message({
        custom:
          'ELEVENLABS_WEBHOOK_SECRET is required in production for ElevenLabs webhook authentication',
      });
    }

    return environment;
  })
  .unknown(true);
