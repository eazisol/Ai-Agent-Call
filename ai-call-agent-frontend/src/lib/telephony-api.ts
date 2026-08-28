import { buildApiUrl } from "./api-url.mjs";

export type TelephonyProviderStatus = {
  provider: string;
  configured: boolean;
  credentialsValid: boolean;
  credentialsMessage: string | null;
  webhookSignatureValidation: boolean;
  webhookUrls: {
    incomingCall: string;
    statusCallback: string;
  } | null;
  activePhoneNumbers: number;
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
    const { timeoutMs, ...fetchInit } = init ?? {};
    const response = await fetch(apiUrl(path), {
      ...fetchInit,
      credentials: "include",
      cache: "no-store",
      headers,
      signal: fetchInit.signal ?? AbortSignal.timeout(timeoutMs ?? 15_000),
    });

    const body = await parseJson(response);
    if (!response.ok) {
      const parsed = errorMessage(body, "Request failed. Please try again.");
      return {
        ok: false,
        status: response.status,
        code: parsed.code,
        message: parsed.message,
      };
    }

    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      message:
        "The telephony provider status could not be loaded. Check your connection and try again.",
    };
  }
}

export function telephonyStatusBadge(
  status: TelephonyProviderStatus | null,
): "success" | "warning" | "error" | "neutral" {
  if (!status?.configured) {
    return "neutral";
  }
  if (status.credentialsValid) {
    return "success";
  }
  return "error";
}

export function formatTelephonyStatus(
  status: TelephonyProviderStatus | null,
): string {
  if (!status) {
    return "Unknown";
  }
  if (!status.configured) {
    return "Not configured";
  }
  if (status.credentialsValid) {
    return "Connected";
  }
  return "Credential error";
}

export const telephonyApi = {
  providerStatus: (options?: { timeoutMs?: number }) =>
    request<{ status: TelephonyProviderStatus }>("telephony/provider-status", {
      timeoutMs: options?.timeoutMs,
    }),
};
