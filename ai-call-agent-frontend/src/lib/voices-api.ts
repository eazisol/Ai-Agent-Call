import { buildApiUrl } from "./api-url.mjs";
import type { OrganizationRole } from "./organizations-api";

export type VoiceGenderPresentation =
  | "female"
  | "male"
  | "neutral"
  | "unknown";

export type VoiceSourceType = "provider_catalog" | "business_clone";

export type VoiceSummary = {
  id: string;
  displayName: string;
  description: string | null;
  languageCodes: string[];
  genderPresentation: VoiceGenderPresentation;
  accent: string | null;
  styleLabels: string[];
  sourceType: VoiceSourceType;
  businessOwned: boolean;
  previewSampleText: string | null;
  previewAudioUrl: string | null;
};

export type VoiceDetail = VoiceSummary & {
  status: "active" | "archived";
  assignedAgentCount: number;
  assignedAgents: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
};

export type VoicePreview = {
  contentType: string;
  audioBase64: string;
};

export type AgentVoiceAssignment = {
  agentId: string;
  voiceId: string | null;
  voice: VoiceSummary | null;
  voicePreference: string;
  warnings: string[];
};

export type ListVoicesParams = {
  q?: string;
  language?: string;
  genderPresentation?: VoiceGenderPresentation;
  accent?: string;
  sourceType?: VoiceSourceType;
  page?: number;
  limit?: number;
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
      signal: fetchInit.signal ?? AbortSignal.timeout(timeoutMs ?? 15_000),
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

function queryString(params: ListVoicesParams): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.language?.trim()) search.set("language", params.language.trim());
  if (params.genderPresentation) {
    search.set("genderPresentation", params.genderPresentation);
  }
  if (params.accent?.trim()) search.set("accent", params.accent.trim());
  if (params.sourceType) search.set("sourceType", params.sourceType);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function canViewVoices(): boolean {
  return true;
}

export function canAssignAgentVoice(
  role: OrganizationRole | undefined,
): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function formatGenderPresentation(
  value: VoiceGenderPresentation | undefined | null,
): string {
  if (value === "female") return "Female";
  if (value === "male") return "Male";
  if (value === "neutral") return "Neutral / Any";
  return "Unknown";
}

export function formatVoiceSourceType(type: VoiceSourceType): string {
  if (type === "business_clone") return "Custom clone";
  return "Provider catalogue";
}

export function playVoicePreview(preview: VoicePreview): HTMLAudioElement {
  const src = `data:${preview.contentType};base64,${preview.audioBase64}`;
  const audio = new Audio(src);
  void audio.play();
  return audio;
}

export const voicesApi = {
  list: (params: ListVoicesParams = {}) =>
    request<{
      voices: VoiceSummary[];
      total: number;
      page: number;
      limit: number;
    }>(`voices${queryString(params)}`, { timeoutMs: 45_000 }),

  get: (id: string) =>
    request<{ voice: VoiceDetail }>(`voices/${encodeURIComponent(id)}`),

  preview: (id: string, sampleText?: string) =>
    request<{ preview: VoicePreview }>(
      `voices/${encodeURIComponent(id)}/preview`,
      {
        method: "POST",
        body: JSON.stringify(sampleText ? { sampleText } : {}),
        timeoutMs: 45_000,
      },
    ),

  getAgentVoice: (agentId: string) =>
    request<{ assignment: AgentVoiceAssignment }>(
      `agents/${encodeURIComponent(agentId)}/voice`,
    ),

  assignAgentVoice: (agentId: string, voiceId: string) =>
    request<{ assignment: AgentVoiceAssignment }>(
      `agents/${encodeURIComponent(agentId)}/voice`,
      {
        method: "PUT",
        body: JSON.stringify({ voiceId }),
      },
    ),

  clearAgentVoice: (agentId: string) =>
    request<{ assignment: AgentVoiceAssignment }>(
      `agents/${encodeURIComponent(agentId)}/voice`,
      { method: "DELETE" },
    ),
};
