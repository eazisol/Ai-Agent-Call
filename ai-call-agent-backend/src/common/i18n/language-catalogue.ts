/**
 * Provider-neutral language catalogue for EaziAICall.
 * Canonical identity = BCP-47 language tags (primary subtag or common regional tags).
 * Availability in this catalogue does NOT imply every voice provider supports the language.
 */

export type LanguageCatalogueEntry = {
  code: string;
  label: string;
  /** Shown first in business UI by default */
  recommended?: boolean;
};

/** Recommended / common starter set for new businesses */
export const RECOMMENDED_LANGUAGE_CODES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'hi',
  'ur',
] as const;

/**
 * Application language catalogue (expandable).
 * Codes are stored as-is; labels are for UI only.
 */
export const LANGUAGE_CATALOGUE: LanguageCatalogueEntry[] = [
  { code: 'en', label: 'English', recommended: true },
  { code: 'es', label: 'Spanish', recommended: true },
  { code: 'fr', label: 'French', recommended: true },
  { code: 'de', label: 'German', recommended: true },
  { code: 'pt', label: 'Portuguese', recommended: true },
  { code: 'ar', label: 'Arabic', recommended: true },
  { code: 'hi', label: 'Hindi', recommended: true },
  { code: 'ur', label: 'Urdu', recommended: true },
  { code: 'zh', label: 'Chinese (Mandarin)' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'fa', label: 'Persian' },
  { code: 'he', label: 'Hebrew' },
  { code: 'el', label: 'Greek' },
  { code: 'sv', label: 'Swedish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'sw', label: 'Swahili' },
  { code: 'tl', label: 'Filipino (Tagalog)' },
];

const CATALOGUE_BY_CODE = new Map(
  LANGUAGE_CATALOGUE.map((entry) => [entry.code.toLowerCase(), entry]),
);

/** Loose BCP-47 primary / simple tag (e.g. en, en-US, zh-CN). */
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function normalizeLanguageCode(code: string): string {
  return code.trim().replace(/_/g, '-');
}

export function isValidLanguageCodeFormat(code: string): boolean {
  const normalized = normalizeLanguageCode(code);
  if (!normalized || normalized.length > 20) {
    return false;
  }
  return LANGUAGE_CODE_PATTERN.test(normalized);
}

export function isCatalogueLanguageCode(code: string): boolean {
  const normalized = normalizeLanguageCode(code);
  if (!isValidLanguageCodeFormat(normalized)) {
    return false;
  }
  // Canonical identity must come from the application catalogue (not free-text names).
  // Expand LANGUAGE_CATALOGUE to support additional languages — do not accept arbitrary codes.
  return CATALOGUE_BY_CODE.has(normalized.toLowerCase());
}

export function getLanguageLabel(code: string): string {
  const normalized = normalizeLanguageCode(code);
  const entry = CATALOGUE_BY_CODE.get(normalized.toLowerCase());
  if (entry) {
    return entry.label;
  }
  return normalized;
}

export function listRecommendedLanguages(): LanguageCatalogueEntry[] {
  return LANGUAGE_CATALOGUE.filter((entry) => entry.recommended);
}

export function listCatalogueLanguages(): LanguageCatalogueEntry[] {
  return [...LANGUAGE_CATALOGUE].sort((a, b) => {
    if (Boolean(a.recommended) !== Boolean(b.recommended)) {
      return a.recommended ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}

/** @deprecated Prefer catalogue validation; kept for gradual migration of call sites. */
export const LEGACY_MVP_LANGUAGE_CODES = [...RECOMMENDED_LANGUAGE_CODES];
