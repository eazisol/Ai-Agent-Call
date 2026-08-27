"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import {
  BusinessHoursEditor,
  closedWeek,
} from "@/components/businesses/business-hours-editor";
import { BusinessLanguagesFields } from "@/components/businesses/business-languages-fields";
import { FormField } from "@/components/patterns/form-field";
import { TimezoneCombobox } from "@/components/forms/timezone-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUSINESS_INDUSTRIES,
  canCreateBusiness,
  formatIndustry,
  type BusinessHour,
  type BusinessIndustry,
  type BusinessLanguage,
} from "@/lib/businesses-api";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export default function CreateBusinessPage() {
  const router = useRouter();
  const { active: org } = useOrganizationSession();
  const { createBusiness } = useBusinessSession();
  const canCreate = canCreateBusiness(org?.role);

  const [name, setName] = React.useState("");
  const [industry, setIndustry] =
    React.useState<BusinessIndustry>("restaurant");
  const [industryLabel, setIndustryLabel] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [timezone, setTimezone] = React.useState("America/New_York");
  const [languages, setLanguages] = React.useState<BusinessLanguage[]>(["en"]);
  const [defaultLanguage, setDefaultLanguage] =
    React.useState<BusinessLanguage>("en");
  const [languageDetectionEnabled, setLanguageDetectionEnabled] =
    React.useState(false);
  const [languageSwitchingEnabled, setLanguageSwitchingEnabled] =
    React.useState(false);
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [hours, setHours] = React.useState<BusinessHour[]>(closedWeek);
  const [error, setError] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [emailError, setEmailError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) {
      return;
    }
    let valid = true;
    if (!name.trim()) {
      setNameError("Business name is required.");
      valid = false;
    } else {
      setNameError(undefined);
    }
    if (!email.trim() || !email.includes("@")) {
      setEmailError("A valid email is required.");
      valid = false;
    } else {
      setEmailError(undefined);
    }
    if (!valid) {
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await createBusiness({
      name: name.trim(),
      industry,
      industryLabel: industry === "other" ? industryLabel.trim() || null : null,
      email: email.trim(),
      phone: phone.trim() || null,
      website: website.trim() || null,
      timezone,
      defaultLanguage,
      languages: Array.from(
        new Set(
          (Array.isArray(languages) ? languages : [])
            .concat(defaultLanguage)
            .map((code) => String(code).trim())
            .filter(Boolean),
        ),
      ),
      languageDetectionEnabled,
      languageSwitchingEnabled,
      settings: {
        city: city.trim() || null,
        country: country.trim() || null,
      },
      hours,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace(`/businesses/${result.business.id}`);
  };

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-lg space-y-3">
        <h1 className="text-2xl font-semibold">Create business</h1>
        <p className="text-sm text-muted-foreground">
          Viewers cannot create businesses. Ask an owner, admin, or manager.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Store className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create business
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a client location under {org?.name ?? "this workspace"}.
          </p>
        </div>
      </div>

      <form
        className="space-y-6 rounded-xl border bg-card p-6"
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        <FormField label="Business name" htmlFor="biz-name" required error={nameError}>
          <Input
            id="biz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="Bella Restaurant"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Industry" htmlFor="biz-industry" required>
            <select
              id="biz-industry"
              className={selectClassName}
              value={industry}
              disabled={submitting}
              onChange={(e) =>
                setIndustry(e.target.value as BusinessIndustry)
              }
            >
              {BUSINESS_INDUSTRIES.map((value) => (
                <option key={value} value={value}>
                  {formatIndustry(value)}
                </option>
              ))}
            </select>
          </FormField>
          {industry === "other" ? (
            <FormField label="Industry label" htmlFor="biz-industry-label">
              <Input
                id="biz-industry-label"
                value={industryLabel}
                onChange={(e) => setIndustryLabel(e.target.value)}
                disabled={submitting}
                placeholder="Clinic, salon…"
              />
            </FormField>
          ) : null}
        </div>

        <BusinessLanguagesFields
          languages={languages}
          defaultLanguage={defaultLanguage}
          languageDetectionEnabled={languageDetectionEnabled}
          languageSwitchingEnabled={languageSwitchingEnabled}
          onLanguagesChange={setLanguages}
          onDefaultLanguageChange={setDefaultLanguage}
          onLanguageDetectionChange={setLanguageDetectionEnabled}
          onLanguageSwitchingChange={setLanguageSwitchingEnabled}
          disabled={submitting}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" htmlFor="biz-email" required error={emailError}>
            <Input
              id="biz-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="hello@bella.example"
            />
          </FormField>
          <FormField label="Phone" htmlFor="biz-phone">
            <Input
              id="biz-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              placeholder="+1-555-0100"
            />
          </FormField>
        </div>

        <FormField label="Website" htmlFor="biz-website">
          <Input
            id="biz-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={submitting}
            placeholder="https://bella.example"
          />
        </FormField>

        <FormField label="Timezone" htmlFor="biz-timezone" required>
          <TimezoneCombobox
            id="biz-timezone"
            value={timezone}
            disabled={submitting}
            onChange={setTimezone}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="City" htmlFor="biz-city">
            <Input
              id="biz-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <FormField label="Country" htmlFor="biz-country">
            <Input
              id="biz-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={submitting}
            />
          </FormField>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium">Business hours</h2>
          <BusinessHoursEditor
            hours={hours}
            onChange={setHours}
            disabled={submitting}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create business"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => router.push("/businesses")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
