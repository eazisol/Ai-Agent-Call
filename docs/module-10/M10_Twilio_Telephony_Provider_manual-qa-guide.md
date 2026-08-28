# M10 — Twilio Telephony Provider — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M10 — Twilio Telephony Provider |
| Phase | P04 — Telephony |
| Status | Complete — 28 August 2026 |
| Depends on | M00 foundation |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M10 delivers **Twilio behind a provider-neutral `TelephonyProviderPort`** — server-managed credentials, provider REST methods for number lifecycle (consumed by M11), secured inbound/status webhooks, normalized errors, and an owner/admin **Integrations** status panel.

**Role in product:** Enable the platform to authenticate with Twilio, validate webhooks, and expose telephony readiness without coupling domain code to Twilio SDK types. Business phone inventory and call routing are **M11/M12**.

## 2. Delivered scope

### In scope

- Extended `TelephonyProviderPort` + `TwilioTelephonyAdapter`  
- Migration `telephony_provider_mappings`  
- Webhooks: `incoming-call`, `call-ended`, `status-callback`  
- `TwilioWebhookGuard` signature validation (with dev bypass)  
- `GET /api/v1/telephony/provider-status` (owner/admin)  
- Portal **Settings → Integrations** status panel  
- Health check `telephony: up | down | disabled`  
- Idempotent call/event handling via existing `CallsService`

### Out of scope (do not file as bugs)

- Business phone number purchase UI (M11)  
- Agent assignment to numbers (M11)  
- Inbound call routing to ElevenLabs (M12)  
- Customer BYOT Twilio accounts  
- n8n in realtime audio path  
- Transcripts / call management depth (M14+)

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| Migration | `1756120000000-TwilioTelephonyProvider` applied |
| Backend `.env` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TELEPHONY_PROVIDER=twilio`, `PUBLIC_BASE_URL` |
| Local dev | `TWILIO_VALIDATE_SIGNATURES=false` acceptable |
| Portal | Owner or admin in active organization |
| Optional | Twilio trial/paid account with valid credentials |

**Not required for M10 gate:** purchased phone number, Twilio Console webhook URLs, ngrok tunnel.

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| View Integrations telephony status | ✓ | ✓ | ✗ | ✗ |
| See webhook URL hints | ✓ | ✓ | ✗ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/settings` | Settings hub |
| `/settings/integrations` | Twilio provider status panel |

## 6. Backend / API surface

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/telephony/provider-status` | Session + active org + owner/admin | Returns non-secret status only |
| POST | `/api/v1/webhooks/twilio/incoming-call` | Twilio signature (or dev bypass) | TwiML response |
| POST | `/api/v1/webhooks/twilio/call-ended` | Twilio signature | JSON `{ success: true }` |
| POST | `/api/v1/webhooks/twilio/status-callback` | Twilio signature | JSON `{ success: true }` |
| GET | `/health/ready` | Public | Includes `checks.telephony` |

**Never returned to clients:** `TWILIO_AUTH_TOKEN`, API key secret, raw Twilio error bodies with secrets.

Internal provider methods (`searchAvailableNumbers`, `purchaseNumber`, etc.) are consumed by M11 — not exposed as public customer APIs in M10.

## 7. Data and integrations

| Artifact | Purpose |
| --- | --- |
| `telephony_provider_mappings` | Provider-level number SID audit (no tenant FK in M10) |
| `call_provider_mappings` | Idempotent call identity |
| `provider_events` | Webhook dedupe |
| `calls` | Lifecycle updates from webhooks |

## 8. End-to-end workflows

### WF-1 — Verify Integrations status (primary M10 journey)

1. Set valid `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` in backend `.env`.  
2. Restart backend (`npm run build` → `npm run start`).  
3. Log in as **owner** or **admin** with active organization selected.  
4. Open **Settings → Integrations**.  
5. Expect **Connected**, **Credentials: Valid**, webhook URLs shown, signature mode matches env.  
6. Click **Refresh status** — values remain consistent.

### WF-2 — Verify RBAC

1. Log in as **viewer** or **manager**.  
2. Open **Settings → Integrations**.  
3. Expect read-only message that only owner/admin can view telephony status (no secret fields).

### WF-3 — Health check

1. `GET http://localhost:3000/health/ready`  
2. With valid Twilio creds: `checks.telephony` = `up`  
3. With empty creds: `disabled` or `down` as implemented

## 9. Test cases

### Happy path

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M10-01 | WF-1 with valid creds | Connected + Valid |
| TC-M10-02 | Refresh status | Same state, no errors |
| TC-M10-03 | Health ready | `telephony: up` |

### Security / tenant

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M10-SEC-01 | Inspect Integrations network response | No auth token / API secrets in JSON |
| TC-M10-SEC-02 | Viewer opens Integrations | No provider status payload |
| TC-M10-SEC-03 | Unauthenticated `GET /telephony/provider-status` | 401 |

### Webhooks (optional manual / tunnel)

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M10-04 | POST webhook with invalid signature (`TWILIO_VALIDATE_SIGNATURES=true`) | 403 `INVALID_WEBHOOK_SIGNATURE` |
| TC-M10-05 | Configure Twilio number webhooks to tunnel URLs | Incoming POST accepted when signature valid |
| TC-M10-06 | Replay same status callback | No duplicate terminal DB corruption |

### Provider errors

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M10-07 | Invalid Auth Token in `.env` | Integrations shows invalid credentials message; health `telephony: down` |

## 10. Evidence expectations

- Screenshot of Integrations **Connected** state  
- Screenshot or curl output of `/health/ready` with `telephony: up`  
- Network tab proof provider-status JSON excludes secrets  
- Note backend PID/restart after `.env` change  

## 11. Known limitations

- **Active numbers (provider): 0** is normal until M11 purchase/import.  
- Webhook URLs show `localhost` until `PUBLIC_BASE_URL` points to a public tunnel.  
- Prototype TwiML may still reference `/voice/stream` — production routing is M12.  
- `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` are **not used** by M10.

## 12. Bug reporting

Include: org role, backend log snippet (redact secrets), Integrations screenshot, whether backend was restarted after `.env` edit, `correlationId` from API errors.

## 13. QA sign-off checklist

- [ ] WF-1 Integrations Connected + Valid  
- [ ] RBAC verified (owner/admin vs viewer)  
- [ ] No secrets in provider-status API response  
- [ ] Health `telephony` reflects configuration  
- [ ] Backend restarted cleanly on port 3000 after env change  
- [ ] Regression spot-check: login, agents list, voice library still work  

**Sign-off**

| Tester | Date | Commit SHA | Result |
| --- | --- | --- | --- |
| | | | Pass / Fail |
