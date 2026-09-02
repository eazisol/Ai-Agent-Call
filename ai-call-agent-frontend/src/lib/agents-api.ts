import { apiRequest } from "./api-client";
﻿import type { OrganizationRole } from "./organizations-api";
import type { VoiceSummary } from "./voices-api";

export type AgentStatus = "active" | "inactive" | "archived";
export type AgentLanguageMode = "single" | "multilingual";
export type AgentVoicePreference = "female" | "male" | "neutral";

export type AgentProviderSyncStatus =
  | "not_provisioned"
  | "pending"
  | "synced"
  | "error";

export type ProviderMapping = {
  provider: string;
  syncStatus: AgentProviderSyncStatus;
  externalAgentId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type AgentSyncResult = {
  provider: string;
  syncStatus: AgentProviderSyncStatus;
  externalAgentId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  warnings: string[];
};

export type AgentProviderStatus = {
  provider: string;
  syncStatus: AgentProviderSyncStatus;
  externalAgentId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  remote: {
    checked: boolean;
    exists: boolean | null;
    name: string | null;
    rawStatus: string | null;
  };
};

export type Agent = {
  id: string;
  businessId: string;
  organizationId: string;
  name: string;
  status: AgentStatus;
  roleLabel: string;
  personality: string | null;
  greeting: string;
  instructions: string;
  useBusinessLanguageSettings: boolean;
  languageMode: AgentLanguageMode;
  language: string;
  languages: string[];
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  voicePreference: AgentVoicePreference;
  voiceId: string | null;
  voiceSummary: VoiceSummary | null;
  escalationEnabled: boolean;
  escalationKeywords: string[];
  escalationContactPhone: string | null;
  escalationContactEmail: string | null;
  escalationMessage: string | null;
  providerMappings: ProviderMapping[];
  createdAt: string;
  updatedAt: string;
};

export type CreateAgentInput = {
  name: string;
  roleLabel: string;
  personality?: string | null;
  greeting: string;
  instructions: string;
  useBusinessLanguageSettings?: boolean;
  languageMode?: AgentLanguageMode;
  language?: string;
  languages?: string[];
  languageDetectionEnabled?: boolean;
  languageSwitchingEnabled?: boolean;
  voicePreference?: AgentVoicePreference;
  escalationEnabled?: boolean;
  escalationKeywords?: string[];
  escalationContactPhone?: string | null;
  escalationContactEmail?: string | null;
  escalationMessage?: string | null;
};

export type UpdateAgentInput = Partial<CreateAgentInput> & {
  status?: AgentStatus;
};

export function canListAgents(): boolean {
  return true;
}

export function canCreateAgent(role: OrganizationRole | undefined): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canUpdateAgent(role: OrganizationRole | undefined): boolean {
  return canCreateAgent(role);
}

export function canActivateAgent(role: OrganizationRole | undefined): boolean {
  return canCreateAgent(role);
}

export function canArchiveAgent(role: OrganizationRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteAgent(role: OrganizationRole | undefined): boolean {
  return canArchiveAgent(role);
}

/** Sync to voice provider â€” same roles as update_agent. */
export function canSyncAgent(role: OrganizationRole | undefined): boolean {
  return canUpdateAgent(role);
}

export function formatAgentStatus(status: AgentStatus): string {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Archived";
}

export function agentStatusBadge(
  status: AgentStatus,
): "success" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "neutral";
}

export function elevenLabsMapping(
  agent: Agent | null | undefined,
): ProviderMapping | null {
  if (!agent?.providerMappings?.length) {
    return null;
  }
  return (
    agent.providerMappings.find((m) => m.provider === "elevenlabs") ?? null
  );
}

export function formatProviderSyncStatus(
  status: AgentProviderSyncStatus | undefined | null,
): string {
  if (status === "synced") return "Synced";
  if (status === "pending") return "Syncingâ€¦";
  if (status === "error") return "Sync error";
  return "Not synced yet";
}

export function providerSyncStatusBadge(
  status: AgentProviderSyncStatus | undefined | null,
): "success" | "warning" | "error" | "info" | "neutral" {
  if (status === "synced") return "success";
  if (status === "pending") return "info";
  if (status === "error") return "error";
  return "neutral";
}

export const agentsApi = {
  list: (includeArchived = false) =>
    apiRequest<{ agents: Agent[] }>(
      includeArchived ? "agents?includeArchived=true" : "agents",
    ),

  get: (id: string) =>
    apiRequest<{ agent: Agent }>(`agents/${encodeURIComponent(id)}`),

  create: (input: CreateAgentInput) =>
    apiRequest<{ agent: Agent }>("agents", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateAgentInput) =>
    apiRequest<{ agent: Agent }>(`agents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  activate: (id: string) =>
    apiRequest<{ agent: Agent }>(`agents/${encodeURIComponent(id)}/activate`, {
      method: "POST",
    }),

  deactivate: (id: string) =>
    apiRequest<{ agent: Agent }>(`agents/${encodeURIComponent(id)}/deactivate`, {
      method: "POST",
    }),

  archive: (id: string) =>
    apiRequest<{ agent: Agent }>(`agents/${encodeURIComponent(id)}/archive`, {
      method: "POST",
    }),

  remove: (id: string) =>
    apiRequest<{ deleted: true }>(`agents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  sync: (id: string) =>
    apiRequest<{ agent: Agent; sync: AgentSyncResult }>(
      `agents/${encodeURIComponent(id)}/sync`,
      { method: "POST", timeoutMs: 45_000 },
    ),

  providerStatus: (id: string) =>
    apiRequest<{ status: AgentProviderStatus }>(
      `agents/${encodeURIComponent(id)}/provider-status`,
      { timeoutMs: 20_000 },
    ),
};
