import { buildApiUrl } from "./api-url.mjs";
import type { OrganizationRole } from "./organizations-api";

export type KnowledgeSourceType = "file" | "url" | "text" | "faq";
export type KnowledgeSourceStatus = "active" | "archived";

export type KnowledgeSyncStatus =
  | "not_provisioned"
  | "pending"
  | "synced"
  | "error";

export type KnowledgeFaqItem = {
  question: string;
  answer: string;
};

export type KnowledgeProviderMapping = {
  provider: string;
  syncStatus: KnowledgeSyncStatus;
  externalSourceId: string | null;
  lastSyncedAt: string | null;
  lastSyncedVersion: number | null;
  lastError: string | null;
};

export type KnowledgeSyncResult = {
  provider: string;
  syncStatus: KnowledgeSyncStatus;
  externalSourceId: string | null;
  lastSyncedAt: string | null;
  lastSyncedVersion: number | null;
  lastError: string | null;
  warnings: string[];
};

export type KnowledgeProviderStatus = {
  provider: string;
  syncStatus: KnowledgeSyncStatus;
  externalSourceId: string | null;
  lastSyncedAt: string | null;
  lastSyncedVersion: number | null;
  lastError: string | null;
  remote: {
    checked: boolean;
    exists: boolean | null;
    name: string | null;
    rawStatus: string | null;
  };
};

export type KnowledgeAssignedAgent = {
  id: string;
  name: string;
};

export type KnowledgeSource = {
  id: string;
  businessId: string;
  organizationId: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  description: string | null;
  language: string | null;
  url: string | null;
  textBody: string | null;
  faqItems: KnowledgeFaqItem[] | null;
  originalFilename: string | null;
  contentType: string | null;
  byteSize: number | null;
  version: number;
  assignedAgentCount: number;
  assignedAgents: KnowledgeAssignedAgent[];
  providerMappings: KnowledgeProviderMapping[];
  needsSync: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentKnowledgeAssignment = {
  assignmentId: string;
  agentId: string;
  knowledge: KnowledgeSource;
  assignedAt: string;
};

export type CreateKnowledgeUrlInput = {
  name: string;
  url: string;
  description?: string | null;
  language?: string | null;
};

export type CreateKnowledgeTextInput = {
  name: string;
  text: string;
  description?: string | null;
  language?: string | null;
};

export type CreateKnowledgeFaqInput = {
  name: string;
  faqItems: KnowledgeFaqItem[];
  description?: string | null;
  language?: string | null;
};

export type UpdateKnowledgeInput = {
  name?: string;
  description?: string | null;
  language?: string | null;
  url?: string;
  text?: string;
  items?: KnowledgeFaqItem[];
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
    const isFormData =
      typeof FormData !== "undefined" && init?.body instanceof FormData;
    if (init?.body && !isFormData && !headers.has("Content-Type")) {
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

export function canViewKnowledge(): boolean {
  return true;
}

export function canCreateKnowledge(role: OrganizationRole | undefined): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canUpdateKnowledge(role: OrganizationRole | undefined): boolean {
  return canCreateKnowledge(role);
}

export function canArchiveKnowledge(role: OrganizationRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteKnowledge(role: OrganizationRole | undefined): boolean {
  return canArchiveKnowledge(role);
}

export function canAssignKnowledge(role: OrganizationRole | undefined): boolean {
  return canCreateKnowledge(role);
}

export function formatKnowledgeType(type: KnowledgeSourceType): string {
  if (type === "file") return "File";
  if (type === "url") return "URL";
  if (type === "text") return "Text";
  return "FAQ";
}

export function formatSyncStatus(
  status: KnowledgeSyncStatus | undefined | null,
): string {
  if (status === "synced") return "Synced";
  if (status === "pending") return "Syncing…";
  if (status === "error") return "Sync error";
  return "Not synced yet";
}

export function syncStatusBadge(
  status: KnowledgeSyncStatus | undefined | null,
): "success" | "warning" | "error" | "info" | "neutral" {
  if (status === "synced") return "success";
  if (status === "pending") return "info";
  if (status === "error") return "error";
  return "neutral";
}

export function elevenLabsKnowledgeMapping(
  source: KnowledgeSource | null | undefined,
): KnowledgeProviderMapping | null {
  if (!source?.providerMappings?.length) {
    return null;
  }
  return (
    source.providerMappings.find((m) => m.provider === "elevenlabs") ?? null
  );
}

export const knowledgeApi = {
  list: (includeArchived = false) =>
    request<{ sources: KnowledgeSource[] }>(
      includeArchived ? "knowledge?includeArchived=true" : "knowledge",
    ),

  get: (id: string) =>
    request<{ source: KnowledgeSource }>(
      `knowledge/${encodeURIComponent(id)}`,
    ),

  createUrl: (input: CreateKnowledgeUrlInput) =>
    request<{ source: KnowledgeSource }>("knowledge/url", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createText: (input: CreateKnowledgeTextInput) =>
    request<{ source: KnowledgeSource }>("knowledge/text", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createFaq: (input: CreateKnowledgeFaqInput) =>
    request<{ source: KnowledgeSource }>("knowledge/faq", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        language: input.language,
        items: input.faqItems,
      }),
    }),

  createFile: (formData: FormData) =>
    request<{ source: KnowledgeSource }>("knowledge/files", {
      method: "POST",
      body: formData,
      timeoutMs: 45_000,
    }),

  update: (id: string, input: UpdateKnowledgeInput) =>
    request<{ source: KnowledgeSource }>(
      `knowledge/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),

  archive: (id: string) =>
    request<{ source: KnowledgeSource }>(
      `knowledge/${encodeURIComponent(id)}/archive`,
      { method: "POST" },
    ),

  remove: (id: string) =>
    request<{ deleted: true }>(`knowledge/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  sync: (id: string) =>
    request<{ knowledge: KnowledgeSource; sync: KnowledgeSyncResult }>(
      `knowledge/${encodeURIComponent(id)}/sync`,
      { method: "POST", timeoutMs: 45_000 },
    ),

  resync: (id: string) =>
    request<{ knowledge: KnowledgeSource; sync: KnowledgeSyncResult }>(
      `knowledge/${encodeURIComponent(id)}/resync`,
      { method: "POST", timeoutMs: 45_000 },
    ),

  providerStatus: (id: string) =>
    request<{ status: KnowledgeProviderStatus }>(
      `knowledge/${encodeURIComponent(id)}/provider-status`,
      { timeoutMs: 20_000 },
    ),

  listAgentKnowledge: (agentId: string) =>
    request<{ assignments: AgentKnowledgeAssignment[] }>(
      `agents/${encodeURIComponent(agentId)}/knowledge`,
    ),

  assignToAgent: (agentId: string, knowledgeId: string) =>
    request<{ assignment: AgentKnowledgeAssignment }>(
      `agents/${encodeURIComponent(agentId)}/knowledge/${encodeURIComponent(knowledgeId)}`,
      { method: "POST" },
    ),

  unassignFromAgent: (agentId: string, knowledgeId: string) =>
    request<{ deleted: true }>(
      `agents/${encodeURIComponent(agentId)}/knowledge/${encodeURIComponent(knowledgeId)}`,
      { method: "DELETE" },
    ),
};