/**
 * Provider-neutral language catalogue (mirrors backend `language-catalogue.ts`).
 * Canonical identity = language codes; labels are UI-only.
 */

export type LanguageCatalogueEntry = {
  code: string;
  label: string;
  recommended?: boolean;
};

export const RECOMMENDED_LANGUAGE_CODES = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "ar",
  "hi",
  "ur",
] as const;

export const LANGUAGE_CATALOGUE: LanguageCatalogueEntry[] = [
  { code: "en", label: "English", recommended: true },
  { code: "es", label: "Spanish", recommended: true },
  { code: "fr", label: "French", recommended: true },
  { code: "de", label: "German", recommended: true },
  { code: "pt", label: "Portuguese", recommended: true },
  { code: "ar", label: "Arabic", recommended: true },
  { code: "hi", label: "Hindi", recommended: true },
  { code: "ur", label: "Urdu", recommended: true },
  { code: "zh", label: "Chinese (Mandarin)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "vi", label: "Vietnamese" },
  { code: "th", label: "Thai" },
  { code: "id", label: "Indonesian" },
  { code: "ms", label: "Malay" },
  { code: "bn", label: "Bengali" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "fa", label: "Persian" },
  { code: "he", label: "Hebrew" },
  { code: "el", label: "Greek" },
  { code: "sv", label: "Swedish" },
  { code: "no", label: "Norwegian" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "hu", label: "Hungarian" },
  { code: "uk", label: "Ukrainian" },
  { code: "sw", label: "Swahili" },
  { code: "tl", label: "Filipino (Tagalog)" },
];

const BY_CODE = new Map(
  LANGUAGE_CATALOGUE.map((entry) => [entry.code.toLowerCase(), entry]),
);

export type BusinessLanguage = string;

/** @deprecated Prefer LANGUAGE_CATALOGUE / recommended set for UI. */
export const BUSINESS_LANGUAGES: BusinessLanguage[] = [
  ...RECOMMENDED_LANGUAGE_CODES,
];

export function formatLanguage(code: string): string {
  return BY_CODE.get(code.toLowerCase())?.label ?? code;
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

export function isCatalogueLanguageCode(code: string): boolean {
  return BY_CODE.has(code.trim().replace(/_/g, "-").toLowerCase());
}
