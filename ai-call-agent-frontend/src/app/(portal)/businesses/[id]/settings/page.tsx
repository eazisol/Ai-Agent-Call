"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { useOrganizationSession } from "@/components/organizations/organization-session";
import { useBusinessSession } from "@/components/businesses/business-session";
import { BusinessSubnav } from "@/components/businesses/business-subnav";
import { BusinessLanguagesFields } from "@/components/businesses/business-languages-fields";
import { FormField } from "@/components/patterns/form-field";
import { TimezoneCombobox } from "@/components/forms/timezone-combobox";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUSINESS_INDUSTRIES,
  businessesApi,
  canArchiveBusiness,
  canUpdateBusiness,
  formatIndustry,
  type Business,
  type BusinessIndustry,
  type BusinessLanguage,
} from "@/lib/businesses-api";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export default function BusinessSettingsPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { active: org } = useOrganizationSession();
  const { refresh: refreshSession } = useBusinessSession();
  const canEdit = canUpdateBusiness(org?.role);
  const canArchive = canArchiveBusiness(org?.role);

  const [business, setBusiness] = React.useState<Business | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [archiveBusy, setArchiveBusy] = React.useState(false);

  const [name, setName] = React.useState("");
  const [industry, setIndustry] =
    React.useState<BusinessIndustry>("restaurant");
  const [industryLabel, setIndustryLabel] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [timezone, setTimezone] = React.useState("UTC");
  const [languages, setLanguages] = React.useState<BusinessLanguage[]>(["en"]);
  const [defaultLanguage, setDefaultLanguage] =
    React.useState<BusinessLanguage>("en");
  const [languageDetectionEnabled, setLanguageDetectionEnabled] =
    React.useState(false);
  const [languageSwitchingEnabled, setLanguageSwitchingEnabled] =
    React.useState(false);
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [address1, setAddress1] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");

  const hydrate = React.useCallback((row: Business) => {
    setBusiness(row);
    setName(row.name);
    setIndustry(row.industry);
    setIndustryLabel(row.industryLabel ?? "");
    setEmail(row.email);
    setPhone(row.phone ?? "");
    setWebsite(row.website ?? "");
    setTimezone(row.timezone);
    const loadedLanguages = Array.isArray(row.languages)
      ? row.languages.filter(Boolean)
      : [];
    const withDefault = loadedLanguages.includes(row.defaultLanguage)
      ? loadedLanguages
      : [...loadedLanguages, row.defaultLanguage].filter(Boolean);
    setLanguages(withDefault.length ? withDefault : [row.defaultLanguage]);
    setDefaultLanguage(row.defaultLanguage);
    setLanguageDetectionEnabled(row.languageDetectionEnabled === true);
    setLanguageSwitchingEnabled(row.languageSwitchingEnabled === true);
    setCity(row.settings.city ?? "");
    setRegion(row.settings.region ?? "");
    setCountry(row.settings.country ?? "");
    setAddress1(row.settings.addressLine1 ?? "");
    setPostalCode(row.settings.postalCode ?? "");
  }, []);

  const load = React.useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await businessesApi.get(id);
    setLoading(false);
    if (!result.ok) {
      setBusiness(null);
      setError(result.message);
      return;
    }
    hydrate(result.data.business);
  }, [hydrate, id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !business) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const selectedLanguages = Array.from(
      new Set(
        (Array.isArray(languages) ? languages : [])
          .concat(defaultLanguage)
          .map((code) => String(code).trim())
          .filter(Boolean),
      ),
    );
    const result = await businessesApi.update(business.id, {
      name: name.trim(),
      industry,
      industryLabel: industry === "other" ? industryLabel.trim() || null : null,
      email: email.trim(),
      phone: phone.trim() || null,
      website: website.trim() || null,
      timezone,
      defaultLanguage,
      languages: selectedLanguages,
      languageDetectionEnabled:
        selectedLanguages.length > 1 && languageDetectionEnabled,
      languageSwitchingEnabled:
        selectedLanguages.length > 1 &&
        languageDetectionEnabled &&
        languageSwitchingEnabled,
      settings: {
        addressLine1: address1.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        postalCode: postalCode.trim() || null,
        country: country.trim() || null,
      },
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    hydrate(result.data.business);
    setSuccess("Business settings saved.");
    await refreshSession();
  };

  const onArchive = async () => {
    if (!business || !canArchive) {
      return;
    }
    setArchiveBusy(true);
    setError(null);
    const result = await businessesApi.archive(business.id);
    setArchiveBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    hydrate(result.data.business);
    setSuccess("Business archived.");
    await refreshSession();
  };

  const onReactivate = async () => {
    if (!business || !canArchive) {
      return;
    }
    setArchiveBusy(true);
    setError(null);
    const result = await businessesApi.update(business.id, {
      status: "active",
    });
    setArchiveBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    hydrate(result.data.business);
    setSuccess("Business reactivated.");
    await refreshSession();
  };

  if (loading) {
    return <LoadingState label="Loading settings…" />;
  }

  if (!business) {
    return (
      <ErrorState
        title="Business not found"
        description={error ?? "Unavailable."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <BusinessSubnav businessId={business.id} active="settings" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Business settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canEdit
            ? "Update profile, contact, timezone, and location."
            : "You can view these settings. Editing requires owner, admin, or manager."}
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-6"
        onSubmit={(e) => void onSubmit(e)}
        noValidate
      >
        <FormField label="Business name" htmlFor="settings-name" required>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting || !canEdit}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Industry" htmlFor="settings-industry">
            <select
              id="settings-industry"
              className={selectClassName}
              value={industry}
              disabled={submitting || !canEdit}
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
        </div>

        {industry === "other" ? (
          <FormField label="Industry label" htmlFor="settings-industry-label">
            <Input
              id="settings-industry-label"
              value={industryLabel}
              onChange={(e) => setIndustryLabel(e.target.value)}
              disabled={submitting || !canEdit}
            />
          </FormField>
        ) : null}

        <BusinessLanguagesFields
          languages={languages}
          defaultLanguage={defaultLanguage}
          languageDetectionEnabled={languageDetectionEnabled}
          languageSwitchingEnabled={languageSwitchingEnabled}
          onLanguagesChange={setLanguages}
          onDefaultLanguageChange={setDefaultLanguage}
          onLanguageDetectionChange={setLanguageDetectionEnabled}
          onLanguageSwitchingChange={setLanguageSwitchingEnabled}
          disabled={submitting || !canEdit}
          languagesId="settings-languages"
          defaultId="settings-default-language"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" htmlFor="settings-email" required>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || !canEdit}
            />
          </FormField>
          <FormField label="Phone" htmlFor="settings-phone">
            <Input
              id="settings-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting || !canEdit}
            />
          </FormField>
        </div>

        <FormField label="Website" htmlFor="settings-website">
          <Input
            id="settings-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={submitting || !canEdit}
          />
        </FormField>

        <FormField label="Timezone" htmlFor="settings-timezone">
          <TimezoneCombobox
            id="settings-timezone"
            value={timezone}
            disabled={submitting || !canEdit}
            onChange={setTimezone}
          />
        </FormField>

        <FormField label="Address" htmlFor="settings-address">
          <Input
            id="settings-address"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            disabled={submitting || !canEdit}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="City" htmlFor="settings-city">
            <Input
              id="settings-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={submitting || !canEdit}
            />
          </FormField>
          <FormField label="Region" htmlFor="settings-region">
            <Input
              id="settings-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={submitting || !canEdit}
            />
          </FormField>
          <FormField label="Postal code" htmlFor="settings-postal">
            <Input
              id="settings-postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={submitting || !canEdit}
            />
          </FormField>
        </div>

        <FormField label="Country" htmlFor="settings-country">
          <Input
            id="settings-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={submitting || !canEdit}
          />
        </FormField>

        {error ? (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="text-sm text-success-strong">
            {success}
          </p>
        ) : null}

        {canEdit ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save settings"}
          </Button>
        ) : null}
      </form>

      {canArchive ? (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-sm font-medium">Archive</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Archived businesses stay visible with include-archived list views
            and cannot be set as the active business.
          </p>
          <div className="mt-4">
            {business.status === "active" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={archiveBusy}
                onClick={() => void onArchive()}
              >
                {archiveBusy ? "Archiving…" : "Archive business"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={archiveBusy}
                onClick={() => void onReactivate()}
              >
                {archiveBusy ? "Reactivating…" : "Reactivate business"}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
