# Language policy (business + agents)

| Field | Value |
| --- | --- |
| Locked | 27 August 2026 (refined) |
| Model | Multi-language catalogue + default/fallback + agent single/multilingual modes |
| Runtime wiring | Provider-neutral in **M05**; ElevenLabs behavior in **M06** |
| Voice library / cloning | **M08** / **M09** (not implemented here) |

## 1. Language catalogue

- Canonical identity = catalogue language codes (BCP-47-compatible tags such as `en`, `ur`, `ar`, `zh-CN`).
- Do **not** store free-text language names as identity.
- Product ships a recommended starter set: English, Spanish, French, German, Portuguese, Arabic, Hindi, Urdu.
- The product is **not** permanently limited to those eight — businesses can **Add language** from the application catalogue.
- Catalogue presence ≠ every provider/model supports the language. Provider support is validated at the provider layer (**M06+**).

## 2. Business language policy

Business settings:

| Customer-facing | Storage |
| --- | --- |
| Supported languages | `languages` (jsonb codes) |
| Default language | `default_language` |
| Automatic language detection | `language_detection_enabled` |
| Allow language switching during conversation | `language_switching_enabled` |

Rules:

- At least one supported language.
- Default **must** belong to supported languages.
- Exactly one language → detection and switching forced **off**.
- Multiple languages → detection/switching may be enabled (default **on** when first selecting 2+).
- **Default language** = initial greeting / fallback only. It must **not** force the whole conversation to stay in that language when automatic detection is enabled.

## 3. Agent language mode

Customer-facing **Language mode**:

| Mode | Storage `language_mode` | Behavior |
| --- | --- | --- |
| Single language | `single` | Exactly one language; detection off; switching off |
| Multilingual / Auto detect | `multilingual` | One or more languages from the business set; optional detection + mid-call switching |

Also:

| Customer-facing | Storage |
| --- | --- |
| Use business defaults / Customize for this agent | `use_business_language_settings` |
| Voice preference (Female / Male / Neutral / Any) | `voice_preference` (`female` \| `male` \| `neutral`) |

- Prefer create default: **Use business language settings**.
- When customized, agent languages must be a **subset** of business-supported languages.
- Agents cannot silently use a language outside the business set — update the business first.

### Single-language runtime intent

Agent operates only in the configured language.

### Multilingual runtime intent (when provider supports it)

1. Caller speaks Urdu → detect Urdu → reply in Urdu.
2. Caller switches to English → detect change → reply in English.
3. Same for other configured languages.
4. Caller does **not** manually select a language.

## 4. Voice preference (M05 only)

- Provider-neutral presentation preference: `voice_preference`.
- Optional future pointer: `voice_id` (no Voice Library FK yet).
- Do **not** treat this as a hard-coded biological “agent gender” domain concept.
- Do **not** store ElevenLabs-specific voice IDs on core agent domain as the primary model.
- Full voice selection/preview = **M08**; cloning = **M09**. UI may show a non-functional note only.

## 5. Module boundaries

| Module | Owns |
| --- | --- |
| **M04 / M05** | Canonical EaziAICall language + voice-preference configuration |
| **M06** | Map compatible settings → ElevenLabs; capability validation; sync status; normalized errors / compatibility warnings |
| **M08** | Voice Library (selection, preview) |
| **M09** | Voice Cloning |

If a configured language is unsupported by the selected ElevenLabs model/voice (**M06**):

- Do **not** corrupt local configuration.
- Show a clear compatibility warning (customer-friendly; not raw provider errors).

## 6. Validation (server-side)

- ≥1 language; default ∈ selected; invalid catalogue codes rejected.
- Agent languages ⊆ business languages.
- Single mode → one language; detection/switching off.
- Switching requires detection (unless architecture later changes).
- Tenant isolation + RBAC preserved.

## 7. Storage summary

- **Business** (`businesses`): `languages`, `default_language`, `language_detection_enabled`, `language_switching_enabled`
- **Agent** (`agent_configs`): above fields + `use_business_language_settings`, `language_mode`, `voice_preference`, nullable `voice_id`
