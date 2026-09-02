import { apiRequest } from "./api-client";
﻿import type { OrganizationRole } from "./organizations-api";

export type VoiceCloneStatus =
  | "draft"
  | "processing"
  | "failed"
  | "ready"
  | "revoked";

export type VoiceCloneSample = {
  id: string;
  originalFilename: string;
  byteSize: number;
  contentType: string;
};

export type VoiceCloneSummary = {
  id: string;
  displayName: string;
  description: string | null;
  status: VoiceCloneStatus;
  voiceAssetId: string | null;
  sampleCount: number;
  assignedAgentCount: number;
  lastError: string | null;
  createdAt: string;
  readyAt: string | null;
};

export type VoiceCloneDetail = VoiceCloneSummary & {
  provider: string;
  submittedAt: string | null;
  revokedAt: string | null;
  consentRecorded: boolean;
  consentAcceptedAt: string | null;
  samples: VoiceCloneSample[];
  assignedAgents: { id: string; name: string }[];
};

export type VoiceCloneStatusSnapshot = {
  status: VoiceCloneStatus;
  lastError: string | null;
  voiceAssetId: string | null;
};

export type CreateVoiceCloneInput = {
  displayName: string;
  description?: string | null;
};

export type RecordVoiceCloneConsentInput = {
  consentVersion: string;
  consentTextHash: string;
};

export type ListVoiceClonesParams = {
  status?: VoiceCloneStatus;
  page?: number;
  limit?: number;
};

export const VOICE_CLONE_CONSENT_VERSION = "m09-v1";
export const VOICE_CLONE_MAX_SAMPLES = 5;
export const VOICE_CLONE_MIN_TOTAL_SECONDS = 60;
export const VOICE_CLONE_MAX_SAMPLE_BYTES = 25 * 1024 * 1024;

function queryString(params: ListVoiceClonesParams): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function canCreateVoiceClone(
  role: OrganizationRole | undefined,
): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canManageVoiceCloneSamples(
  role: OrganizationRole | undefined,
): boolean {
  return canCreateVoiceClone(role);
}

export function canRevokeVoiceClone(
  role: OrganizationRole | undefined,
): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteVoiceClone(
  role: OrganizationRole | undefined,
): boolean {
  return canRevokeVoiceClone(role);
}

export function formatVoiceCloneStatus(
  status: VoiceCloneStatus | undefined | null,
): string {
  if (status === "draft") return "Draft";
  if (status === "processing") return "Processing";
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "revoked") return "Revoked";
  return "Unknown";
}

export function voiceCloneStatusBadge(
  status: VoiceCloneStatus | undefined | null,
): "success" | "warning" | "error" | "info" | "neutral" {
  if (status === "ready") return "success";
  if (status === "processing") return "info";
  if (status === "failed") return "error";
  if (status === "revoked") return "warning";
  if (status === "draft") return "neutral";
  return "neutral";
}

export function formatSampleBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const voiceClonesApi = {
  list: (params: ListVoiceClonesParams = {}) =>
    apiRequest<{
      clones: VoiceCloneSummary[];
      total: number;
      page: number;
      limit: number;
    }>(`voices/clones${queryString(params)}`),

  get: (id: string) =>
    apiRequest<{ clone: VoiceCloneDetail }>(
      `voices/clones/${encodeURIComponent(id)}`,
    ),

  status: (id: string) =>
    apiRequest<VoiceCloneStatusSnapshot>(
      `voices/clones/${encodeURIComponent(id)}/status`,
    ),

  create: (input: CreateVoiceCloneInput) =>
    apiRequest<{ clone: VoiceCloneDetail }>("voices/clones", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  recordConsent: (id: string, input: RecordVoiceCloneConsentInput) =>
    apiRequest<{ consent: { id: string; acceptedAt: string } }>(
      `voices/clones/${encodeURIComponent(id)}/consent`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  uploadSample: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ sample: VoiceCloneSample }>(
      `voices/clones/${encodeURIComponent(id)}/samples`,
      {
        method: "POST",
        body: formData,
        timeoutMs: 60_000,
      },
    );
  },

  deleteSample: (cloneId: string, sampleId: string) =>
    apiRequest<void>(
      `voices/clones/${encodeURIComponent(cloneId)}/samples/${encodeURIComponent(sampleId)}`,
      { method: "DELETE" },
    ),

  submit: (id: string) =>
    apiRequest<{ clone: VoiceCloneDetail }>(
      `voices/clones/${encodeURIComponent(id)}/submit`,
      { method: "POST", timeoutMs: 60_000 },
    ),

  retry: (id: string) =>
    apiRequest<{ clone: VoiceCloneDetail }>(
      `voices/clones/${encodeURIComponent(id)}/retry`,
      { method: "POST", timeoutMs: 60_000 },
    ),

  revoke: (id: string) =>
    apiRequest<{ clone: VoiceCloneDetail }>(
      `voices/clones/${encodeURIComponent(id)}/revoke`,
      { method: "POST" },
    ),

  remove: (id: string) =>
    apiRequest<{ deleted: true }>(
      `voices/clones/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
};


