export default () => ({
    app: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10),
        baseUrl: process.env.APP_BASE_URL,
    },
    database: {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        name: process.env.DATABASE_NAME,
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    n8n: {
        callCompletedWebhook: process.env.N8N_CALL_COMPLETED_WEBHOOK,
    },
});