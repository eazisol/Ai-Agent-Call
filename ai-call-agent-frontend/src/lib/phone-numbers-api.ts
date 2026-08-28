import { buildApiUrl } from "./api-url.mjs";
import type { OrganizationRole } from "./organizations-api";

export type PhoneNumberStatus =
  | "provisioning"
  | "active"
  | "release_pending"
  | "released"
  | "failed";

export type PhoneNumberCapabilities = {
  voice: boolean;
  sms: boolean;
  mms: boolean;
};

export type PhoneNumberAssignment = {
  id: string;
  agentId: string;
  agentName: string;
  status: "active" | "ended";
  assignedAt: string;
};

export type PhoneNumber = {
  id: string;
  phoneNumberE164: string;
  country: string;
  provider: string;
  status: PhoneNumberStatus;
  capabilities: PhoneNumberCapabilities;
  friendlyName: string | null;
  assignment: PhoneNumberAssignment | null;
  providerNumberId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PhoneNumberSearchCandidate = {
  phoneNumber: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  isoCountry: string;
  capabilities: PhoneNumberCapabilities;
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
  init?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const { timeoutMs, ...fetchInit } = init ?? {};
    const response = await fetch(apiUrl(path), {
      ...fetchInit,
      credentials: "include",
      cache: "no-store",
      headers,
      signal: fetchInit.signal ?? AbortSignal.timeout(timeoutMs ?? 30_000),
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
      message:
        "The request timed out or the API is temporarily unavailable. Check your connection and try again.",
    };
  }
}

export function canListPhoneNumbers(): boolean {
  return true;
}

export function canSearchPhoneNumbers(
  role: OrganizationRole | undefined,
): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canPurchasePhoneNumber(
  role: OrganizationRole | undefined,
): boolean {
  return role === "owner" || role === "admin";
}

export function canImportPhoneNumber(
  role: OrganizationRole | undefined,
): boolean {
  return canPurchasePhoneNumber(role);
}

export function canAssignPhoneNumber(
  role: OrganizationRole | undefined,
): boolean {
  return canSearchPhoneNumbers(role);
}

export function canReleasePhoneNumber(
  role: OrganizationRole | undefined,
): boolean {
  return canPurchasePhoneNumber(role);
}

export function formatPhoneNumberStatus(status: PhoneNumberStatus): string {
  if (status === "active") return "Active";
  if (status === "provisioning") return "Provisioning";
  if (status === "release_pending") return "Releasing";
  if (status === "released") return "Released";
  return "Failed";
}

export function phoneNumberStatusBadge(
  status: PhoneNumberStatus,
): "success" | "warning" | "error" | "neutral" {
  if (status === "active") return "success";
  if (status === "provisioning" || status === "release_pending") {
    return "warning";
  }
  if (status === "failed") return "error";
  return "neutral";
}

export function formatCapabilities(
  capabilities: PhoneNumberCapabilities,
): string {
  const parts: string[] = [];
  if (capabilities.voice) parts.push("Voice");
  if (capabilities.sms) parts.push("SMS");
  if (capabilities.mms) parts.push("MMS");
  return parts.length > 0 ? parts.join(", ") : "None";
}

export function formatProviderError(
  code: string | undefined,
  message: string,
): string {
  if (code === "PROVIDER_NOT_CONFIGURED") {
    return "Telephony is not configured on the server. An owner or admin must configure Twilio credentials under Settings → Integrations.";
  }
  if (code === "TELEPHONY_NUMBER_UNAVAILABLE") {
    return "That number is no longer available. Search again and choose another candidate.";
  }
  if (code === "PHONE_NUMBER_ALREADY_EXISTS") {
    return message;
  }
  if (code === "PHONE_NUMBER_HAS_ASSIGNMENT") {
    return message;
  }
  if (
    code?.startsWith("TELEPHONY_") ||
    code?.startsWith("PROVIDER_") ||
    code === "PHONE_NUMBER_NOT_AT_PROVIDER"
  ) {
    return message;
  }
  return message;
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value.trim());
}

export const phoneNumbersApi = {
  list: (params?: {
    status?: PhoneNumberStatus;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return request<{
      items: PhoneNumber[];
      page: number;
      limit: number;
      total: number;
    }>(`phone-numbers${suffix}`);
  },

  get: (id: string) =>
    request<{ phoneNumber: PhoneNumber }>(
      `phone-numbers/${encodeURIComponent(id)}`,
    ),

  search: (body: {
    isoCountry: string;
    areaCode?: string;
    contains?: string;
    limit?: number;
  }) =>
    request<{ candidates: PhoneNumberSearchCandidate[] }>(
      "phone-numbers/search",
      {
        method: "POST",
        body: JSON.stringify(body),
        timeoutMs: 45_000,
      },
    ),

  purchase: (body: {
    phoneNumber: string;
    friendlyName?: string;
    confirm: true;
  }) =>
    request<{ phoneNumber: PhoneNumber }>("phone-numbers/purchase", {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: 60_000,
    }),

  importNumber: (body: { phoneNumber: string; friendlyName?: string }) =>
    request<{ phoneNumber: PhoneNumber }>("phone-numbers/import", {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: 45_000,
    }),

  assign: (id: string, agentId: string) =>
    request<{
      phoneNumberId: string;
      assignment: PhoneNumberAssignment;
    }>(`phone-numbers/${encodeURIComponent(id)}/assign`, {
      method: "POST",
      body: JSON.stringify({ agentId }),
    }),

  unassign: (id: string) =>
    request<{ phoneNumberId: string; assignment: null }>(
      `phone-numbers/${encodeURIComponent(id)}/unassign`,
      { method: "POST" },
    ),

  release: (
    id: string,
    body: {
      confirm: true;
      unassignFirst?: boolean;
      releaseReason?: string;
    },
  ) =>
    request<{
      phoneNumberId: string;
      status: PhoneNumberStatus;
      releasedAt: string;
    }>(`phone-numbers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify(body),
      timeoutMs: 45_000,
    }),
};
