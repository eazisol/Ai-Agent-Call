# Security and provider smoke-test runbook

## Production invariants

- `PUBLIC_BASE_URL` uses HTTPS and exactly matches Twilio's configured origin.
- `TWILIO_VALIDATE_SIGNATURES=true` and `TWILIO_AUTH_TOKEN` comes from a secret
  manager, never a frontend variable or committed file.
- `VOICE_STREAM_SIGNING_SECRET` and `N8N_ENCRYPTION_KEY` are independent random
  values of at least 32 characters.
- `PROTOTYPE_API_ENABLED=false` in production.
- CORS lists explicit trusted origins; do not use `*` with credentials.
- Provider/audio/webhook payloads and credentials are not logged.

## Opt-in Twilio/OpenAI smoke test

1. Use disposable sandbox/test credentials and a recoverable development DB.
2. Expose the backend through an HTTPS tunnel and set `PUBLIC_BASE_URL` to that
   exact origin.
3. Enable Twilio signature validation and set OpenAI/Twilio secrets locally.
4. Run migrations and confirm `/health/ready` is healthy.
5. Configure the two Twilio webhook paths documented in the root README.
6. Place one controlled call, confirm the signature is accepted, the media token
   is verified, bidirectional audio works, and one provider mapping/event exists.
7. Repeat the completion webhook and verify it does not duplicate the event.
8. Remove the tunnel and rotate disposable secrets after the test.

Never put n8n in the media path. Do not make live provider calls from CI or the
default test command.
