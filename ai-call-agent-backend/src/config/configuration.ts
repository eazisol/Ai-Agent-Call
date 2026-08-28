const booleanValue = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

const numberValue = (value: string | undefined, fallback: number): number =>
  Number.parseInt(value ?? String(fallback), 10);

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    app: {
      name: 'EaziAiCall',
      nodeEnv,
      port: numberValue(process.env.PORT, 3000),
      publicBaseUrl:
        process.env.PUBLIC_BASE_URL ??
        process.env.APP_BASE_URL ??
        'http://localhost:3000',
      corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      prototypeApiEnabled: booleanValue(
        process.env.PROTOTYPE_API_ENABLED,
        nodeEnv === 'development',
      ),
      logLevel: process.env.LOG_LEVEL ?? 'log',
    },
    database: {
      host: process.env.DATABASE_HOST,
      port: numberValue(process.env.DATABASE_PORT, 5432),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      name: process.env.DATABASE_NAME,
      ssl: booleanValue(process.env.DATABASE_SSL, false),
    },
    redis: {
      enabled: booleanValue(process.env.REDIS_ENABLED, true),
      host: process.env.REDIS_HOST ?? 'localhost',
      port: numberValue(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD,
      connectTimeoutMs: numberValue(process.env.REDIS_CONNECT_TIMEOUT_MS, 1500),
    },
    objectStorage: {
      enabled: booleanValue(process.env.OBJECT_STORAGE_ENABLED, false),
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
      region: process.env.OBJECT_STORAGE_REGION ?? 'us-east-1',
      bucket: process.env.OBJECT_STORAGE_BUCKET,
      accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
      healthTimeoutMs: numberValue(
        process.env.OBJECT_STORAGE_HEALTH_TIMEOUT_MS,
        2000,
      ),
    },
    knowledge: {
      maxFileBytes: numberValue(
        process.env.KNOWLEDGE_MAX_FILE_BYTES,
        10 * 1024 * 1024,
      ),
    },
    voices: {
      catalogCacheTtlSeconds: numberValue(
        process.env.VOICE_CATALOG_CACHE_TTL_SECONDS,
        3600,
      ),
    },
    providers: {
      telephony: process.env.TELEPHONY_PROVIDER ?? 'twilio',
      voiceAgent: process.env.VOICE_AGENT_PROVIDER ?? 'openai_realtime',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      realtimeModel: process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime',
      defaultVoice: process.env.OPENAI_DEFAULT_VOICE ?? 'alloy',
      defaultInstructions:
        process.env.OPENAI_DEFAULT_INSTRUCTIONS ??
        'You are a helpful AI receptionist. Speak clearly and professionally.',
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY ?? '',
      baseUrl:
        process.env.ELEVENLABS_API_BASE_URL ?? 'https://api.elevenlabs.io',
      timeoutMs: numberValue(process.env.ELEVENLABS_TIMEOUT_MS, 20_000),
      voiceFemale:
        process.env.ELEVENLABS_DEFAULT_VOICE_FEMALE ?? 'EXAVITQu4vr4xnSDxMaL',
      voiceMale:
        process.env.ELEVENLABS_DEFAULT_VOICE_MALE ?? 'pNInz6obpgDQGcFmaJgB',
      voiceNeutral:
        process.env.ELEVENLABS_DEFAULT_VOICE_NEUTRAL ?? 'JBFqnCBsd6RMkjVDRZzb',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      validateSignatures: booleanValue(
        process.env.TWILIO_VALIDATE_SIGNATURES,
        true,
      ),
    },
    voiceStream: {
      signingSecret: process.env.VOICE_STREAM_SIGNING_SECRET,
      tokenTtlSeconds: numberValue(
        process.env.VOICE_STREAM_TOKEN_TTL_SECONDS,
        120,
      ),
      maxDurationSeconds: numberValue(
        process.env.VOICE_STREAM_MAX_DURATION_SECONDS,
        7200,
      ),
      maxMessageBytes: numberValue(
        process.env.VOICE_STREAM_MAX_MESSAGE_BYTES,
        1_048_576,
      ),
    },
    n8n: {
      enabled: booleanValue(process.env.N8N_ENABLED, false),
      callCompletedWebhook: process.env.N8N_CALL_COMPLETED_WEBHOOK,
    },
    auth: {
      jwtAccessSecret: process.env.AUTH_JWT_ACCESS_SECRET,
      accessTtlSeconds: numberValue(process.env.AUTH_ACCESS_TTL_SECONDS, 900),
      refreshTtlSeconds: numberValue(
        process.env.AUTH_REFRESH_TTL_SECONDS,
        2_592_000,
      ),
      verificationTtlSeconds: numberValue(
        process.env.AUTH_VERIFICATION_TTL_SECONDS,
        86_400,
      ),
      resetTtlSeconds: numberValue(process.env.AUTH_RESET_TTL_SECONDS, 3_600),
      inviteTtlSeconds: numberValue(
        process.env.AUTH_INVITE_TTL_SECONDS,
        604_800,
      ),
      bcryptRounds: numberValue(process.env.AUTH_BCRYPT_ROUNDS, 12),
      publicAppUrl:
        process.env.AUTH_PUBLIC_APP_URL ??
        process.env.CORS_ORIGINS?.split(',')[0]?.trim() ??
        'http://localhost:3001',
      accessCookieName: process.env.AUTH_ACCESS_COOKIE_NAME ?? 'eazi_access',
      refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'eazi_refresh',
      orgCookieName: process.env.AUTH_ORG_COOKIE_NAME ?? 'eazi_org',
      bizCookieName: process.env.AUTH_BIZ_COOKIE_NAME ?? 'eazi_biz',
      cookieSecure: booleanValue(
        process.env.AUTH_COOKIE_SECURE,
        nodeEnv === 'production',
      ),
      cookieSameSite: (process.env.AUTH_COOKIE_SAME_SITE ??
        (nodeEnv === 'production' ? 'none' : 'lax')) as
        | 'lax'
        | 'strict'
        | 'none',
      rateLimitMax: numberValue(process.env.AUTH_RATE_LIMIT_MAX, 20),
      rateLimitWindowMs: numberValue(
        process.env.AUTH_RATE_LIMIT_WINDOW_MS,
        900_000,
      ),
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: numberValue(process.env.SMTP_PORT, 587),
      secure: booleanValue(process.env.SMTP_SECURE, false),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.SMTP_FROM,
      timeoutMs: numberValue(process.env.SMTP_TIMEOUT_MS, 10_000),
    },
  };
};
