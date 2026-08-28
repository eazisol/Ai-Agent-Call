# M11 — Phone Number Management — Manual QA Handoff

| Field | Value |
| --- | --- |
| Module | M11 — Phone Number Management |
| Phase | P04 — Telephony |
| Status | Complete — 28 August 2026 |
| Depends on | M04, M05, M10 |
| Blocks | M12 Incoming AI Calls |
| Audience | Manual QA Engineer / Tester |
| Build reference | Record commit SHA and test date in sign-off |

---

## 1. Module overview

M11 delivers **canonical Business-owned phone number inventory** with search, purchase, import, agent assignment (≤1 active per number), and safe release. All provider operations go through M10 `TelephonyProviderPort` — domain code never calls the Twilio SDK directly.

**Role in product:** Bridge Twilio number lifecycle to Business + Agent assignment. Inbound call routing (resolve number → agent → ElevenLabs) is **M12**.

## 2. Delivered scope

### In scope

- Tables `phone_numbers`, `phone_number_assignments` (migration `1756130000000`)  
- REST `/api/v1/phone-numbers/*` (list, search, purchase, import, assign, unassign, release)  
- RBAC matrix (owner/admin purchase/import/release; manager assign; viewer read-only)  
- Portal `/phone-numbers`, `/phone-numbers/new`, `/phone-numbers/import`  
- Assign / release confirmation dialogs  
- Integrations page link to phone inventory  

### Out of scope (do not file as bugs)

- Inbound call routing to assigned agent (M12)  
- Live call history / transcripts (M14+)  
- Customer BYOT Twilio accounts  
- Number porting from arbitrary carriers  
- Billing / per-number cost dashboard (M25–M26)  
- n8n in realtime audio path  

## 3. Dependencies and prerequisites

| Requirement | Notes |
| --- | --- |
| Migrations | `1756120000000-TwilioTelephonyProvider`, `1756130000000-PhoneNumberManagement` applied |
| Backend `.env` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TELEPHONY_PROVIDER=twilio`, `PUBLIC_BASE_URL` |
| Portal session | Active organization (`eazi_org`) + active business (`eazi_biz`) cookies |
| Test users | Owner/admin for purchase; manager for assign-only tests; viewer for read-only |
| Optional | Twilio account with funds to purchase a number; existing number in platform account for import |

**Recommended test data:** At least one **active agent** in the active business for assignment workflows.

## 4. Roles and permissions

| Action | owner | admin | manager | viewer |
| --- | --- | --- | --- | --- |
| List / view inventory | ✓ | ✓ | ✓ | ✓ |
| Search available numbers | ✓ | ✓ | ✓ | ✗ |
| Purchase | ✓ | ✓ | ✗ | ✗ |
| Import | ✓ | ✓ | ✗ | ✗ |
| Assign / unassign | ✓ | ✓ | ✓ | ✗ |
| Release | ✓ | ✓ | ✗ | ✗ |
| See `providerNumberId` in API | ✓ | ✓ | ✓ | ✗ |

## 5. User-facing surfaces

| Route | Purpose |
| --- | --- |
| `/phone-numbers` | Inventory list, filters, assign/unassign/release |
| `/phone-numbers/new` | Search → select → confirm purchase |
| `/phone-numbers/import` | Map provider-owned E.164 into business inventory |
| `/settings/integrations` | M10 Twilio status + link to phone numbers |

## 6. Backend / API surface

| Method | Path | RBAC | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/phone-numbers` | All roles | Paginated list for active business |
| GET | `/api/v1/phone-numbers/:id` | All roles | Detail |
| POST | `/api/v1/phone-numbers/search` | owner/admin/manager | No DB write |
| POST | `/api/v1/phone-numbers/purchase` | owner/admin | Requires `{ confirm: true }` |
| POST | `/api/v1/phone-numbers/import` | owner/admin | Provider lookup + configure |
| POST | `/api/v1/phone-numbers/:id/assign` | owner/admin/manager | Replaces prior active assignment |
| POST | `/api/v1/phone-numbers/:id/unassign` | owner/admin/manager | Idempotent |
| DELETE | `/api/v1/phone-numbers/:id` | owner/admin | Body `{ confirm: true, unassignFirst?: true }` |

**Never returned to clients:** Twilio auth token, API key secrets, raw provider error bodies with credentials.

## 7. Data and integrations

| Artifact | Purpose |
| --- | --- |
| `phone_numbers` | Canonical business inventory (`business_id` FK) |
| `phone_number_assignments` | Active/historical agent links (≤1 active per number) |
| `telephony_provider_mappings` (M10) | Provider SID audit on purchase/import |
| M10 `TelephonyProviderPort` | search, purchase, lookup, configure, release |

## 8. End-to-end workflows

### WF-1 — Inventory list (read path)

1. Log in as any role with active org + business.  
2. Open **Phone numbers** in sidebar.  
3. Expect table with E.164, status badge, country, capabilities, assignment column.  
4. Use status filter tabs (All / Active / …).  
5. Empty state shows purchase/import CTAs for owner/admin only.

### WF-2 — Search → purchase → assign (primary happy path)

1. Log in as **owner** or **admin**.  
2. Confirm **Settings → Integrations** shows Twilio Connected + Valid.  
3. Open **Phone numbers → Search & purchase**.  
4. Search US numbers (optional area code).  
5. Select a candidate → confirm purchase checkbox → **Purchase**.  
6. Expect success screen; return to list — number status **Active**.  
7. Click **Assign** → choose active agent → **Assign agent**.  
8. List shows agent name in assignment column.

### WF-3 — Unassign

1. On an assigned number, click **Unassign**.  
2. Expect success toast; assignment column shows **Unassigned**.  
3. Click **Unassign** again — still succeeds (idempotent).

### WF-4 — Release (destructive)

1. On an assigned number, click **Release** without unassigning.  
2. Expect error about active assignment OR use **Unassign first** checkbox in modal.  
3. Type full E.164 exactly → **Confirm release**.  
4. Number status becomes **Released**; removed from active filters.

### WF-5 — Import existing platform number

1. Ensure a number exists in the platform Twilio account but not in inventory.  
2. **Phone numbers → Import** → enter E.164 → **Import**.  
3. Expect active row in list.  
4. Duplicate import/purchase of same E.164 → `PHONE_NUMBER_ALREADY_EXISTS`.

## 9. Test cases

### Happy path

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M11-01 | WF-1 list | Rows scoped to active business only |
| TC-M11-02 | WF-2 purchase + assign | Active number + active assignment |
| TC-M11-03 | WF-3 unassign twice | Second call still succeeds |
| TC-M11-04 | WF-4 release with confirm | Status `released` |
| TC-M11-05 | WF-5 import | Active inventory row |

### Security / tenant

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M11-SEC-01 | Switch business cookie; open number from other business via API | `PHONE_NUMBER_NOT_FOUND` (404) |
| TC-M11-SEC-02 | Manager attempts purchase UI | No purchase button / API `FORBIDDEN` |
| TC-M11-SEC-03 | Viewer attempts assign/release | Actions hidden or `FORBIDDEN` |
| TC-M11-SEC-04 | Viewer list API response | No `providerNumberId` field |
| TC-M11-SEC-05 | Release without typing E.164 in modal | Confirm button disabled |

### Negative / provider

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M11-NEG-01 | Purchase without confirm checkbox | Validation / `CONFIRMATION_REQUIRED` |
| TC-M11-NEG-02 | Search with Twilio creds missing | `PROVIDER_NOT_CONFIGURED` + UI message |
| TC-M11-NEG-03 | Purchase unavailable number | `TELEPHONY_NUMBER_UNAVAILABLE` + retry search |
| TC-M11-NEG-04 | Import number not in Twilio account | `PHONE_NUMBER_NOT_AT_PROVIDER` |
| TC-M11-NEG-05 | Assign to inactive/archived agent | `PHONE_ASSIGNMENT_AGENT_INACTIVE` |

### Edge / reconciliation

| ID | Steps | Expected |
| --- | --- | --- |
| TC-M11-EDGE-01 | Re-assign different agent | Prior assignment ended; one active row |
| TC-M11-EDGE-02 | Release already released number | Idempotent success |
| TC-M11-EDGE-03 | Provider release 404 | Local row still marked released (M10 adapter idempotency) |

## 10. Evidence expectations

- Screenshot of phone numbers list with Active status + assignment  
- Screenshot of purchase confirm step with checkbox  
- Screenshot of release modal with E.164 confirmation  
- Network tab: purchase/assign API responses (no Twilio secrets)  
- Note backend restart after `.env` changes  
- Optional: Twilio Console showing number webhooks point to `PUBLIC_BASE_URL` paths  

## 11. Known limitations

- **Inbound calls do not route to assigned agent yet** — M12.  
- Purchase charges real Twilio billing — use trial/low-cost numbers in QA.  
- Country derivation from E.164 is heuristic for non-US numbers.  
- Provisioning failures leave `failed` rows — may require ops cleanup.  
- `TWILIO_API_KEY_*` vars are unused by M11 (M10/M11 use account SID + auth token).

## 12. Environment variables

M11 introduces **no new environment variables**. Reuses M10 telephony configuration documented in `ai-call-agent-backend/.env.example`:

- `TWILIO_ACCOUNT_SID`  
- `TWILIO_AUTH_TOKEN`  
- `TELEPHONY_PROVIDER=twilio`  
- `PUBLIC_BASE_URL`  

## 13. Bug reporting

Include: org role, active business name, phone number id/E.164, API `error.code`, `correlationId`, backend log snippet (redact secrets), whether Twilio Integrations shows Connected.

## 14. Regression scope

After M11 changes, spot-check:

- Login / org / business switchers  
- Agents list + create  
- Knowledge list  
- Voice library  
- Settings → Integrations (M10)  
- `/health/ready`

## 15. QA sign-off checklist

- [ ] WF-1 inventory list loads for active business  
- [ ] WF-2 search → purchase → assign (owner/admin)  
- [ ] WF-3 unassign idempotent  
- [ ] WF-4 release requires E.164 confirmation  
- [ ] WF-5 import (if Twilio number available)  
- [ ] RBAC verified (owner/admin vs manager vs viewer)  
- [ ] Cross-business access denied (`PHONE_NUMBER_NOT_FOUND`)  
- [ ] No Twilio secrets in API JSON  
- [ ] Integrations link to `/phone-numbers` works  
- [ ] Regression spot-check passed  

**Sign-off**

| Tester | Date | Commit SHA | Result |
| --- | --- | --- | --- |
| | | | Pass / Fail |
