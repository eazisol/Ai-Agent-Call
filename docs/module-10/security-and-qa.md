# Module 10 — Security & QA evidence

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Submodule | 10.04 |
| Status | Verified — 28 August 2026 |

## Security controls

| Control | Evidence |
| --- | --- |
| Webhook signature verification | `TwilioWebhookGuard` validates `x-twilio-signature` using `TelephonyProviderPort.validateWebhook` + `PUBLIC_BASE_URL`; dev bypass via `TWILIO_VALIDATE_SIGNATURES=false` only — unit `telephony-webhook-guard.test.js` |
| Credentials server-side only | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` read from server env via `ConfigService`; never returned by `GET /telephony/provider-status` — e2e JSON scan |
| No Auth Token in DB | Migration `1756120000000` stores provider mappings only; operational policy locked |
| RBAC on provider status | Owner/admin only — `telephony-permissions.test.js` + `app.telephony.e2e-test.js` |
| Active organization required | Provider status requires `eazi_org` cookie — e2e |
| Idempotent webhooks | `CallsService.recordProviderEvent` dedupes; `TwilioService` skips duplicate terminal transitions — `telephony-webhooks.test.js` |
| Normalized provider errors | `TwilioTelephonyAdapter.mapRestError` maps 401/403/429/404 to `ApplicationError` codes; never raw Twilio body to portal |
| Provider-neutral domain | Business routing and phone inventory deferred to M11/M12; M10 adapter + webhooks only |
| Tenant isolation (M10 scope) | Webhooks create prototype/global call rows until M12; provider-status scoped by org membership, not cross-org data leak |

## Automated QA (executed 28 August 2026)

| Suite | Result |
| --- | --- |
| Backend `npm run build` | Pass |
| `test/unit/telephony-domain.test.js` | Pass — configured state, webhook URLs, credential validation, validateWebhook |
| `test/unit/telephony-webhooks.test.js` | Pass — incoming call, idempotent call-ended/status, validateWebhook delegation |
| `test/unit/telephony-webhook-guard.test.js` | Pass — dev bypass, invalid signature 403, valid signature |
| `test/unit/telephony-permissions.test.js` | Pass — owner/admin vs manager/viewer |
| `test/app.telephony.e2e-test.js` | Pass — provider-status RBAC, no secrets in JSON |
| Manual Integrations UI | Pass — Connected + Valid credentials (local `.env`) |

## Manual QA mapping (10.04 checklist)

| Item | Covered by |
| --- | --- |
| P04-M10-04-01 Webhook signatures | Guard unit tests + Manual TC-M10-04 |
| P04-M10-04-02 Server-side credentials | E2e secret scan + operational policy + Manual TC-M10-01 |
| P04-M10-04-03 Idempotent callbacks | `telephony-webhooks.test.js` + Manual TC-M10-06 |
| P04-M10-04-04 Tenant isolation | Permissions + org cookie e2e + Manual TC-M10-SEC-02 |
| P04-M10-04-05 Credential validation | Adapter unit + live Integrations panel |
| P04-M10-04-06 Webhook verification | Guard unit + Manual TC-M10-04 |
| P04-M10-04-07 Event normalization | `telephony-webhooks.test.js` event types |
| P04-M10-04-08 Number configuration | Adapter purchase/configure (10.02) + Manual TC-M10-05 |
| P04-M10-04-09 Provider failure handling | Adapter error mapping + Manual TC-M10-07 |
| P04-M10-04-10 Regression | Agents/knowledge/voices unit suites unchanged |
| P04-M10-04-11 End-to-end journey | Manual QA guide WF-1 (Integrations status) |

## Residual risk / known limits

- Live Twilio REST (search/purchase) not exercised in CI — requires credentials + billing.  
- Webhook signature E2E against real Twilio POST not in CI — guard logic unit-tested; manual tunnel test optional before production.  
- Prototype TwiML still routes to `/voice/stream` until M12 replaces production path.  
- `telephony_provider_mappings` has no `business_id` by design — M11 adds canonical inventory.  
- Keep committed `.env.example` free of real secrets.

## Regression scope

Run before M11 starts:

- `npm run test`  
- `npm run test:e2e`  
- Spot-check `/settings/integrations` as owner  
- `GET /health/ready` → `telephony: up` when configured
