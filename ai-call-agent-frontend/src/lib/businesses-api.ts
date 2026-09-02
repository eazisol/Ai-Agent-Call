import { apiRequest } from "./api-client";
import type { OrganizationRole } from "./organizations-api";

import {
  formatLanguage as catalogueFormatLanguage,
  type BusinessLanguage,
} from "./language-catalogue";

export type { BusinessLanguage } from "./language-catalogue";
export { BUSINESS_LANGUAGES } from "./language-catalogue";


export type BusinessIndustry =
  | "healthcare"
  | "restaurant"
  | "retail"
  | "professional_services"
  | "hospitality"
  | "other";

export type BusinessStatus = "active" | "archived";

export const BUSINESS_INDUSTRIES: BusinessIndustry[] = [
  "healthcare",
  "restaurant",
  "retail",
  "professional_services",
  "hospitality",
  "other",
];

export type BusinessSettings = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
};

export type BusinessHour = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type Business = {
  id: string;
  organizationId: string;
  name: string;
  industry: BusinessIndustry;
  industryLabel: string | null;
  website: string | null;
  email: string;
  phone: string | null;
  timezone: string;
  defaultLanguage: BusinessLanguage;
  languages: BusinessLanguage[];
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  status: BusinessStatus;
  settings: BusinessSettings;
  hours: BusinessHour[];
  createdAt: string;
  updatedAt: string;
};

export type CreateBusinessInput = {
  name: string;
  industry: BusinessIndustry;
  industryLabel?: string | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  timezone: string;
  defaultLanguage: BusinessLanguage;
  languages: BusinessLanguage[];
  languageDetectionEnabled?: boolean;
  languageSwitchingEnabled?: boolean;
  settings?: Partial<BusinessSettings>;
  hours?: BusinessHour[];
};

export type UpdateBusinessInput = Partial<CreateBusinessInput> & {
  status?: BusinessStatus;
};

export function canCreateBusiness(role: OrganizationRole | undefined): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canUpdateBusiness(role: OrganizationRole | undefined): boolean {
  return canCreateBusiness(role);
}

export function canArchiveBusiness(role: OrganizationRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function formatIndustry(industry: BusinessIndustry, label?: string | null): string {
  const names: Record<BusinessIndustry, string> = {
    healthcare: "Healthcare",
    restaurant: "Restaurant",
    retail: "Retail",
    professional_services: "Professional services",
    hospitality: "Hospitality",
    other: "Other",
  };
  if (industry === "other" && label?.trim()) {
    return label.trim();
  }
  return names[industry];
}

export function formatLanguage(code: BusinessLanguage): string {
  return catalogueFormatLanguage(code);
}

export function formatLanguages(
  languages: BusinessLanguage[],
  defaultLanguage?: BusinessLanguage,
): string {
  const unique = [...new Set(languages.length ? languages : defaultLanguage ? [defaultLanguage] : [])];
  if (!unique.length) {
    return "�";
  }
  return unique
    .map((code) =>
      defaultLanguage && code === defaultLanguage
        ? `${formatLanguage(code)} (default)`
        : formatLanguage(code),
    )
    .join(", ");
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

/** Businesses client � credentials cookies only; no request body logging. */
export const businessesApi = {
  list: (includeArchived = false) =>
    apiRequest<{ businesses: Business[] }>(
      includeArchived ? "businesses?includeArchived=true" : "businesses",
    ),

  get: (id: string) =>
    apiRequest<{ business: Business }>(`businesses/${encodeURIComponent(id)}`),

  create: (input: CreateBusinessInput) =>
    apiRequest<{ business: Business }>("businesses", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateBusinessInput) =>
    apiRequest<{ business: Business }>(`businesses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  archive: (id: string) =>
    apiRequest<{ business: Business }>(
      `businesses/${encodeURIComponent(id)}/archive`,
      { method: "POST" },
    ),

  remove: (id: string) =>
    apiRequest<{ deleted: true }>(`businesses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  getActive: () =>
    apiRequest<{ business: Business | null }>("businesses/active"),

  setActive: (businessId: string) =>
    apiRequest<{ business: Business }>("businesses/active", {
      method: "POST",
      body: JSON.stringify({ businessId }),
    }),

  clearActive: () =>
    apiRequest<{ cleared: true }>("businesses/active", { method: "DELETE" }),
};


