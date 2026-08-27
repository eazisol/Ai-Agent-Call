"use client";

import * as React from "react";

import { FormField } from "@/components/patterns/form-field";
import { cn } from "@/lib/utils";
import { formatLanguage, type BusinessLanguage } from "@/lib/language-catalogue";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export type AgentLanguageMode = "single" | "multilingual";
export type AgentVoicePreference = "female" | "male" | "neutral";

export type AgentLanguageVoiceValue = {
  useBusinessLanguageSettings: boolean;
  languageMode: AgentLanguageMode;
  languages: BusinessLanguage[];
  defaultLanguage: BusinessLanguage;
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  voicePreference: AgentVoicePreference;
};

type AgentLanguageVoiceFieldsProps = {
  value: AgentLanguageVoiceValue;
  businessLanguages: BusinessLanguage[];
  businessDefaultLanguage: BusinessLanguage;
  onChange: (next: AgentLanguageVoiceValue) => void;
  disabled?: boolean;
};

/**
 * Agent language + voice preference fields for create/edit (M05).
 * Voice library / cloning remain M08 / M09 — preview/selection is a stub only.
 */
export function AgentLanguageVoiceFields({
  value,
  businessLanguages,
  businessDefaultLanguage,
  onChange,
  disabled = false,
}: AgentLanguageVoiceFieldsProps) {
  const multiBiz = businessLanguages.length > 1;
  const patch = (partial: Partial<AgentLanguageVoiceValue>) =>
    onChange({ ...value, ...partial });

  const setInherit = (inherit: boolean) => {
    if (inherit) {
      patch({
        useBusinessLanguageSettings: true,
        languageMode: multiBiz ? "multilingual" : "single",
        languages: [...businessLanguages],
        defaultLanguage: businessDefaultLanguage,
        languageDetectionEnabled: multiBiz,
        languageSwitchingEnabled: multiBiz,
      });
      return;
    }
    patch({
      useBusinessLanguageSettings: false,
      languageMode: "single",
      languages: [businessDefaultLanguage],
      defaultLanguage: businessDefaultLanguage,
      languageDetectionEnabled: false,
      languageSwitchingEnabled: false,
    });
  };

  const setMode = (mode: AgentLanguageMode) => {
    if (mode === "single") {
      const only = value.defaultLanguage || businessDefaultLanguage;
      patch({
        languageMode: "single",
        languages: [only],
        defaultLanguage: only,
        languageDetectionEnabled: false,
        languageSwitchingEnabled: false,
      });
      return;
    }
    const langs =
      value.languages.length > 1
        ? value.languages
        : businessLanguages.length > 1
          ? [...businessLanguages]
          : value.languages;
    const multi = langs.length > 1;
    patch({
      languageMode: "multilingual",
      languages: langs,
      defaultLanguage: langs.includes(value.defaultLanguage)
        ? value.defaultLanguage
        : langs[0]!,
      languageDetectionEnabled: multi,
      languageSwitchingEnabled: multi,
    });
  };

  const toggleLanguage = (code: BusinessLanguage) => {
    const selected = value.languages.includes(code);
    if (selected) {
      if (value.languages.length === 1) return;
      const next = value.languages.filter((item) => item !== code);
      patch({
        languages: next,
        defaultLanguage:
          value.defaultLanguage === code ? next[0]! : value.defaultLanguage,
        languageDetectionEnabled: next.length > 1 && value.languageDetectionEnabled,
        languageSwitchingEnabled:
          next.length > 1 &&
          value.languageDetectionEnabled &&
          value.languageSwitchingEnabled,
      });
      return;
    }
    if (value.languageMode === "single") {
      patch({
        languages: [code],
        defaultLanguage: code,
        languageDetectionEnabled: false,
        languageSwitchingEnabled: false,
      });
      return;
    }
    const next = [...value.languages, code];
    patch({
      languages: next,
      languageDetectionEnabled: true,
      languageSwitchingEnabled: true,
    });
  };

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Language settings</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            className="mt-1"
            name="agent-lang-source"
            checked={value.useBusinessLanguageSettings}
            disabled={disabled}
            onChange={() => setInherit(true)}
          />
          <span>
            <span className="font-medium">Use business defaults</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Inherit supported languages and detection settings from this
              business.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            className="mt-1"
            name="agent-lang-source"
            checked={!value.useBusinessLanguageSettings}
            disabled={disabled}
            onChange={() => setInherit(false)}
          />
          <span>
            <span className="font-medium">Customize for this agent</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Use a subset of the business languages for this agent only.
            </span>
          </span>
        </label>
      </fieldset>

      {!value.useBusinessLanguageSettings ? (
        <div className="space-y-4 border-t border-border pt-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Language mode</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                className="mt-1"
                name="agent-lang-mode"
                checked={value.languageMode === "single"}
                disabled={disabled}
                onChange={() => setMode("single")}
              />
              <span>
                <span className="font-medium">Single language</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  The agent always operates in one selected language.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                className="mt-1"
                name="agent-lang-mode"
                checked={value.languageMode === "multilingual"}
                disabled={disabled || businessLanguages.length < 2}
                onChange={() => setMode("multilingual")}
              />
              <span>
                <span className="font-medium">Multilingual / Auto detect</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Detect the caller’s language and reply in it. Callers do not
                  choose a language manually.
                </span>
              </span>
            </label>
          </fieldset>

          <FormField label="Supported languages" htmlFor="agent-languages" required>
            <div
              id="agent-languages"
              role="group"
              className="grid gap-2 rounded-md border border-input p-3 sm:grid-cols-2"
            >
              {businessLanguages.map((code) => {
                const checked = value.languages.includes(code);
                return (
                  <label
                    key={code}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type={value.languageMode === "single" ? "radio" : "checkbox"}
                      name="agent-lang-pick"
                      className="size-4 border-input"
                      checked={checked}
                      disabled={
                        disabled ||
                        (checked &&
                          value.languageMode !== "single" &&
                          value.languages.length === 1)
                      }
                      onChange={() => toggleLanguage(code)}
                    />
                    <span>{formatLanguage(code)}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Only languages already enabled for the business are available.
            </p>
          </FormField>

          {value.languageMode === "multilingual" ? (
            <>
              <FormField label="Default language" htmlFor="agent-default-lang" required>
                <select
                  id="agent-default-lang"
                  className={selectClassName}
                  value={value.defaultLanguage}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({ defaultLanguage: e.target.value })
                  }
                >
                  {value.languages.map((code) => (
                    <option key={code} value={code}>
                      {formatLanguage(code)}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="space-y-3 rounded-md border border-input p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-input"
                    checked={value.languageDetectionEnabled}
                    disabled={disabled || value.languages.length < 2}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      patch({
                        languageDetectionEnabled: enabled,
                        languageSwitchingEnabled: enabled
                          ? value.languageSwitchingEnabled
                          : false,
                      });
                    }}
                  />
                  <span>
                    <span className="font-medium">Automatic language detection</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Reply in the language the caller is speaking.
                    </span>
                  </span>
                </label>
                <label
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    !value.languageDetectionEnabled && "opacity-50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-input"
                    checked={
                      value.languageSwitchingEnabled &&
                      value.languageDetectionEnabled
                    }
                    disabled={disabled || !value.languageDetectionEnabled}
                    onChange={(e) =>
                      patch({ languageSwitchingEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <span className="font-medium">Mid-call language switching</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Follow the caller if they switch languages during the call.
                    </span>
                  </span>
                </label>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <fieldset className="space-y-2 border-t border-border pt-4">
        <legend className="text-sm font-medium">Voice preference</legend>
        {(
          [
            ["female", "Female"],
            ["male", "Male"],
            ["neutral", "Neutral / Any"],
          ] as const
        ).map(([code, label]) => (
          <label key={code} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="agent-voice-pref"
              className="size-4"
              checked={value.voicePreference === code}
              disabled={disabled}
              onChange={() => patch({ voicePreference: code })}
            />
            <span>{label}</span>
          </label>
        ))}
        <p className="text-xs text-muted-foreground">
          Presentation preference for the agent’s voice. Specific voice selection
          and previews will come from the Voice Library later.
        </p>
        <p className="rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground">
          Custom cloned voices will be available from Voice Library / Voice
          Cloning.
        </p>
      </fieldset>
    </div>
  );
}
