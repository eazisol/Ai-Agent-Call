"use client";

import * as React from "react";

import { FormField } from "@/components/patterns/form-field";
import { cn } from "@/lib/utils";
import {
  formatLanguage,
  listCatalogueLanguages,
  listRecommendedLanguages,
  type BusinessLanguage,
} from "@/lib/language-catalogue";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

type BusinessLanguagesFieldsProps = {
  languages: BusinessLanguage[];
  defaultLanguage: BusinessLanguage;
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  onLanguagesChange: (languages: BusinessLanguage[]) => void;
  onDefaultLanguageChange: (language: BusinessLanguage) => void;
  onLanguageDetectionChange: (enabled: boolean) => void;
  onLanguageSwitchingChange: (enabled: boolean) => void;
  disabled?: boolean;
  languagesId?: string;
  defaultId?: string;
};

export function BusinessLanguagesFields({
  languages,
  defaultLanguage,
  languageDetectionEnabled,
  languageSwitchingEnabled,
  onLanguagesChange,
  onDefaultLanguageChange,
  onLanguageDetectionChange,
  onLanguageSwitchingChange,
  disabled = false,
  languagesId = "biz-languages",
  defaultId = "biz-default-language",
}: BusinessLanguagesFieldsProps) {
  const multi = languages.length > 1;
  const [addOpen, setAddOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const languagesRef = React.useRef(languages);
  languagesRef.current = languages;

  const recommended = React.useMemo(() => listRecommendedLanguages(), []);
  const catalogue = React.useMemo(() => listCatalogueLanguages(), []);

  const selectedSet = React.useMemo(() => new Set(languages), [languages]);

  const visibleCodes = React.useMemo(() => {
    const recommendedCodes = recommended.map((entry) => entry.code);
    const extras = languages.filter((code) => !recommendedCodes.includes(code));
    return [...recommendedCodes, ...extras];
  }, [languages, recommended]);

  const addable = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.filter((entry) => {
      if (selectedSet.has(entry.code)) return false;
      if (!q) return !entry.recommended;
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.code.toLowerCase().includes(q)
      );
    });
  }, [catalogue, query, selectedSet]);

  const toggleLanguage = (code: BusinessLanguage) => {
    const current = languagesRef.current;
    const selected = current.includes(code);
    if (selected) {
      if (current.length === 1) {
        return;
      }
      const next = current.filter((item) => item !== code);
      languagesRef.current = next;
      onLanguagesChange(next);
      if (defaultLanguage === code) {
        onDefaultLanguageChange(next[0]!);
      }
      if (next.length < 2) {
        onLanguageDetectionChange(false);
        onLanguageSwitchingChange(false);
      }
      return;
    }
    const next = [...current, code];
    languagesRef.current = next;
    onLanguagesChange(next);
    if (next.length > 1) {
      onLanguageDetectionChange(true);
      onLanguageSwitchingChange(true);
    }
  };

  const addLanguage = (code: BusinessLanguage) => {
    if (languages.includes(code)) return;
    toggleLanguage(code);
    setQuery("");
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <FormField label="Languages" htmlFor={`${languagesId}-group`} required>
        <div
          id={`${languagesId}-group`}
          role="group"
          aria-label="Supported languages"
          className="grid gap-2 rounded-md border border-input p-3 sm:grid-cols-2"
        >
          {visibleCodes.map((code) => {
            const checked = languages.includes(code);
            return (
              <label
                key={code}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "hover:bg-muted/60",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={checked}
                  disabled={disabled || (checked && languages.length === 1)}
                  onChange={() => toggleLanguage(code)}
                />
                <span>{formatLanguage(code)}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-2 space-y-2">
          <button
            type="button"
            className={cn(
              "text-sm font-medium text-foreground underline-offset-4 hover:underline",
              disabled && "pointer-events-none opacity-50",
            )}
            disabled={disabled}
            onClick={() => setAddOpen((open) => !open)}
          >
            + Add language
          </button>
          {addOpen ? (
            <div className="rounded-md border border-input p-3">
              <input
                type="search"
                className={selectClassName}
                placeholder="Search languages…"
                value={query}
                disabled={disabled}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search languages to add"
              />
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm">
                {addable.length === 0 ? (
                  <li className="px-2 py-1.5 text-muted-foreground">
                    No matching languages.
                  </li>
                ) : (
                  addable.map((entry) => (
                    <li key={entry.code}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted/60"
                        disabled={disabled}
                        onClick={() => addLanguage(entry.code)}
                      >
                        <span>{entry.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.code}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground">
          Choose every language this business can serve. Callers do not pick a
          language manually — the agent detects among this list when enabled.
        </p>
      </FormField>

      <FormField label="Default language" htmlFor={defaultId} required>
        <select
          id={defaultId}
          className={selectClassName}
          value={defaultLanguage}
          disabled={disabled || languages.length === 0}
          onChange={(e) =>
            onDefaultLanguageChange(e.target.value as BusinessLanguage)
          }
        >
          {languages.map((code) => (
            <option key={code} value={code}>
              {formatLanguage(code)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Used for the opening greeting and as a fallback when detection is
          unavailable. It does not lock the whole conversation to one language
          when automatic detection is on.
        </p>
      </FormField>

      <div className="space-y-3 rounded-md border border-input p-3">
        <label
          className={cn(
            "flex items-start gap-2 text-sm",
            (!multi || disabled) && "opacity-50",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={languageDetectionEnabled && multi}
            disabled={disabled || !multi}
            onChange={(e) => {
              const enabled = e.target.checked;
              onLanguageDetectionChange(enabled);
              if (!enabled) {
                onLanguageSwitchingChange(false);
              }
            }}
          />
          <span>
            <span className="font-medium">Automatic language detection</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Detect the caller’s language from the selected set and reply in
              that language.
            </span>
          </span>
        </label>

        <label
          className={cn(
            "flex items-start gap-2 text-sm",
            (!multi || !languageDetectionEnabled || disabled) && "opacity-50",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={
              languageSwitchingEnabled && multi && languageDetectionEnabled
            }
            disabled={disabled || !multi || !languageDetectionEnabled}
            onChange={(e) => onLanguageSwitchingChange(e.target.checked)}
          />
          <span>
            <span className="font-medium">
              Allow language switching during conversation
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              If the caller changes language mid-call, continue in the new
              language when the voice provider supports it.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
