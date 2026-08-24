Our final direction will be:

```text
OUR SAAS
│
├── Web App
│   └── Next.js + React + TypeScript
│
├── Backend
│   └── NestJS + TypeScript
│
├── Core Infrastructure
│   ├── PostgreSQL
│   ├── Redis
│   └── S3 / Object Storage
│
└── PROVIDER ABSTRACTION
    │
    ├── TelephonyProvider
    │   ├── Twilio        ← First implementation
    │   └── Telnyx        ← Future
    │
    └── VoiceAgentProvider
        ├── ElevenLabs    ← First implementation
        ├── Retell        ← Future option
        └── OpenAI Custom ← Future/high-volume option
```

### Phase 1

For now we will actually build and use:

```text
Next.js
   ↓
NestJS
   ↓
PostgreSQL + Redis + S3
   ↓
Twilio
   ↓
ElevenLabs Agent
```

Our **own SaaS remains the source of truth**. ElevenLabs will handle the realtime AI receptionist/voice layer, while Twilio handles phone calls.

### First development sequence

1. Finalize multi-tenant SaaS database architecture.
2. Create `TelephonyProvider` abstraction.
3. Implement `TwilioProvider`.
4. Create `VoiceAgentProvider` abstraction.
5. Implement `ElevenLabsProvider`.
6. Build Business/Agent onboarding.
7. Add knowledge-base upload and synchronization.
8. Add voice selection + custom voice cloning workflow.
9. Connect Twilio numbers with agents.
10. Build inbound-call flow.
11. Store call/transcript/summary metadata in our PostgreSQL.
12. Add business tools such as reservation/appointment APIs.
13. Add n8n post-call automation.
14. Add subscriptions, usage tracking and billing.
15. Later plug in Retell/OpenAI without redesigning the SaaS.

**Next, we should start with Step 1: redesigning our PostgreSQL database for the multi-tenant SaaS architecture.**
