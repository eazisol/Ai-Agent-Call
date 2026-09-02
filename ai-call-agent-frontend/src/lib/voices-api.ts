import { apiRequest } from "./api-client";
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
    apiRequest<{
      voices: VoiceSummary[];
      total: number;
      page: number;
      limit: number;
    }>(`voices${queryString(params)}`, { timeoutMs: 45_000 }),

  get: (id: string) =>
    apiRequest<{ voice: VoiceDetail }>(`voices/${encodeURIComponent(id)}`),

  preview: (id: string, sampleText?: string) =>
    apiRequest<{ preview: VoicePreview }>(
      `voices/${encodeURIComponent(id)}/preview`,
      {
        method: "POST",
        body: JSON.stringify(sampleText ? { sampleText } : {}),
        timeoutMs: 45_000,
      },
    ),

  getAgentVoice: (agentId: string) =>
    apiRequest<{ assignment: AgentVoiceAssignment }>(
      `agents/${encodeURIComponent(agentId)}/voice`,
    ),

  assignAgentVoice: (agentId: string, voiceId: string) =>
    apiRequest<{ assignment: AgentVoiceAssignment }>(
      `agents/${encodeURIComponent(agentId)}/voice`,
      {
        method: "PUT",
        body: JSON.stringify({ voiceId }),
      },
    ),

  clearAgentVoice: (agentId: string) =>
    apiRequest<{ assignment: AgentVoiceAssignment }>(
      `agents/${encodeURIComponent(agentId)}/voice`,
      { method: "DELETE" },
    ),
};
