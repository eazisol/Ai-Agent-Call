import { buildApiUrl } from "./api-url.mjs";

export type CallStatus = "started" | "in_progress" | "completed" | "failed";

export type CallDirection = "inbound" | "outbound";

export type CallListItem = {
  id: string;
  direction: CallDirection | null;
  status: CallStatus;
  callerNumber: string | null;
  receiverNumber: string | null;
  businessId: string | null;
  agentId: string | null;
  agentName: string | null;
  phoneNumberId: string | null;
  failureCode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  providerLinks?: {
    twilioCallSid: string;
    elevenLabsConversationId: string | null;
  };
};

export type CallEventView = {
  eventType: string;
  source: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type CallDetailResponse = {
  call: CallListItem;
  events: CallEventView[];
};

export type CallListResponse = {
  items: CallListItem[];
  page: number;
  limit: number;
  total: number;
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

export function formatCallStatus(status: CallStatus): string {
  if (status === "in_progress") return "In progress";
  if (status === "started") return "Started";
  if (status === "completed") return "Completed";
  return "Failed";
}

export function callStatusBadge(
  status: CallStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "in_progress") return "info";
  if (status === "started") return "warning";
  return "neutral";
}

const FAILURE_LABELS: Record<string, string> = {
  UNKNOWN_NUMBER: "Unknown number",
  UNASSIGNED_NUMBER: "Line not assigned",
  INACTIVE_AGENT: "Agent unavailable",
  CROSS_BUSINESS_MAPPING: "Configuration error",
  UNSYNCED_AGENT: "Agent not synced",
  PROVIDER_UNAVAILABLE: "Voice provider unavailable",
  HANDOFF_FAILED: "Could not connect call",
  KNOWLEDGE_NOT_READY: "Knowledge not ready",
  VOICE_NOT_READY: "Voice not ready",
};

export function formatFailureCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return FAILURE_LABELS[code] ?? code.replaceAll("_", " ").toLowerCase();
}

export function formatCallDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return "—";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatCallApiError(
  code: string | undefined,
  message: string,
): string {
  if (code === "ACTIVE_BUSINESS_REQUIRED") {
    return "Select an active business to view call history.";
  }
  if (code === "ACTIVE_ORGANIZATION_REQUIRED") {
    return "Select an active organization to view call history.";
  }
  if (code === "CALL_NOT_FOUND") {
    return "This call was not found in your active business.";
  }
  if (code === "UNAUTHORIZED") {
    return "Sign in again to view calls.";
  }
  if (code === "FORBIDDEN") {
    return "You do not have permission to view calls.";
  }
  return message;
}

export const callsApi = {
  list: (params?: {
    status?: CallStatus;
    direction?: CallDirection;
    agentId?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    query.set("direction", params?.direction ?? "inbound");
    if (params?.status) query.set("status", params.status);
    if (params?.agentId) query.set("agentId", params.agentId);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<CallListResponse>(`calls?${query.toString()}`);
  },

  get: (id: string) =>
    request<CallDetailResponse>(`calls/${encodeURIComponent(id)}`),
};

export function canViewCallProviderLinks(
  role: string | undefined,
): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}
