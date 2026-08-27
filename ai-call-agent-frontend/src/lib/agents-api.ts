import { buildApiUrl } from "./api-url.mjs";
import type { OrganizationRole } from "./organizations-api";

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
      signal:
        fetchInit.signal ?? AbortSignal.timeout(timeoutMs ?? 15_000),
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

export function canListAgents(_role: OrganizationRole | undefined): boolean {
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

/** Sync to voice provider — same roles as update_agent. */
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
  if (status === "pending") return "Syncing…";
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
    request<{ agents: Agent[] }>(
      includeArchived ? "agents?includeArchived=true" : "agents",
    ),

  get: (id: string) =>
    request<{ agent: Agent }>(`agents/${encodeURIComponent(id)}`),

  create: (input: CreateAgentInput) =>
    request<{ agent: Agent }>("agents", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateAgentInput) =>
    request<{ agent: Agent }>(`agents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  activate: (id: string) =>
    request<{ agent: Agent }>(`agents/${encodeURIComponent(id)}/activate`, {
      method: "POST",
    }),

  deactivate: (id: string) =>
    request<{ agent: Agent }>(`agents/${encodeURIComponent(id)}/deactivate`, {
      method: "POST",
    }),

  archive: (id: string) =>
    request<{ agent: Agent }>(`agents/${encodeURIComponent(id)}/archive`, {
      method: "POST",
    }),

  remove: (id: string) =>
    request<{ deleted: true }>(`agents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  sync: (id: string) =>
    request<{ agent: Agent; sync: AgentSyncResult }>(
      `agents/${encodeURIComponent(id)}/sync`,
      { method: "POST", timeoutMs: 45_000 },
    ),

  providerStatus: (id: string) =>
    request<{ status: AgentProviderStatus }>(
      `agents/${encodeURIComponent(id)}/provider-status`,
      { timeoutMs: 20_000 },
    ),
};
