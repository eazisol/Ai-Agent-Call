# Module 10 — Operational policy (roadmap lock)

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Status | **Locked** — 28 August 2026 |

## Credential policy

| Variable | Storage | Exposure |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Server `.env` only | Never in API responses or frontend |
| `TWILIO_AUTH_TOKEN` | Server `.env` only | Never in DB, logs, API, or frontend |
| `TWILIO_VALIDATE_SIGNATURES` | Server config | Documented in ops runbooks |

**MVP:** Platform-managed Twilio account only. No customer BYOT.

## Webhook URL requirements

Twilio signs requests using the **full public URL** it POSTed to. The backend must validate with the same URL.

| Requirement | Notes |
| --- | --- |
| `PUBLIC_BASE_URL` | Must equal the origin Twilio hits (scheme + host + port if non-default) |
| Path | `/api/v1/webhooks/twilio/incoming-call`, `.../status-callback`, `.../call-ended` |
| Proxy / tunnel | Configure proxy to forward original host or reconstruct URL consistently |
| HTTPS | Required in production |
| Dev bypass | `TWILIO_VALIDATE_SIGNATURES=false` — local/tunnel testing only; never production |

### Common failure modes

- App listens on `localhost:3000` but Twilio hits tunnel URL — validator must use tunnel URL  
- Missing `/api/v1` prefix in Twilio console vs app routes  
- HTTP vs HTTPS mismatch  
- Load balancer terminates TLS but forwards HTTP internally — use `X-Forwarded-*` or fixed public base URL  

## Persistence policy

- Optional `telephony_provider_mappings` for provider-level number SID audit (no secrets)  
- Reuse `provider_events` + `call_provider_mappings` for webhook dedupe  
- Do not add provider log tables unless observability gaps require them  
- Never store Auth Token  

## Health / ops

- `/health/ready` may report `telephony: up | down | disabled`  
- `/api/v1/telephony/provider-status` for owner/admin integration settings (non-secret config only)  

## Out of scope (M10 ops)

- Per-Business Twilio sub-accounts  
- Customer credential upload  
- Call routing to Agent (M12)  
