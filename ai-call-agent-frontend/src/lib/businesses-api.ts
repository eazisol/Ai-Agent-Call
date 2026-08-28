import { buildApiUrl } from "./api-url.mjs";
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

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string; status?: number };

type ErrorEnvelope = {
  error?: { code?: string; message?: string };
};

function apiUrl(path: string): string {
  return buildApiUrl(
    path,
    process.env.INTERNAL_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function errorMessage(
  body: unknown,
  fallback: string,
): { message: string; code?: string } {
  const envelope = body as ErrorEnvelope | null;
  return {
    message: envelope?.error?.message?.trim() || fallback,
    code: envelope?.error?.code,
  };
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers,
      signal: init?.signal ?? AbortSignal.timeout(15_000),
    });

    const body = await parseJson(response);
    if (!response.ok) {
      const parsed = errorMessage(body, "Request failed. Please try again.");
      return {
        ok: false,
        status: response.status,
        message: parsed.message,
        code: parsed.code,
      };
    }

    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      message: "The EaziAiCall API is temporarily unavailable.",
    };
  }
}

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
    request<{ businesses: Business[] }>(
      includeArchived ? "businesses?includeArchived=true" : "businesses",
    ),

  get: (id: string) =>
    request<{ business: Business }>(`businesses/${encodeURIComponent(id)}`),

  create: (input: CreateBusinessInput) =>
    request<{ business: Business }>("businesses", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateBusinessInput) =>
    request<{ business: Business }>(`businesses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  archive: (id: string) =>
    request<{ business: Business }>(
      `businesses/${encodeURIComponent(id)}/archive`,
      { method: "POST" },
    ),

  remove: (id: string) =>
    request<{ deleted: true }>(`businesses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  getActive: () =>
    request<{ business: Business | null }>("businesses/active"),

  setActive: (businessId: string) =>
    request<{ business: Business }>("businesses/active", {
      method: "POST",
      body: JSON.stringify({ businessId }),
    }),

  clearActive: () =>
    request<{ cleared: true }>("businesses/active", { method: "DELETE" }),
};


