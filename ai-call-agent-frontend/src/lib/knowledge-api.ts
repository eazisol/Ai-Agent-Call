import { apiRequest } from "./api-client";
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
    apiRequest<{ sources: KnowledgeSource[] }>(
      includeArchived ? "knowledge?includeArchived=true" : "knowledge",
    ),

  get: (id: string) =>
    apiRequest<{ source: KnowledgeSource }>(
      `knowledge/${encodeURIComponent(id)}`,
    ),

  createUrl: (input: CreateKnowledgeUrlInput) =>
    apiRequest<{ source: KnowledgeSource }>("knowledge/url", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createText: (input: CreateKnowledgeTextInput) =>
    apiRequest<{ source: KnowledgeSource }>("knowledge/text", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createFaq: (input: CreateKnowledgeFaqInput) =>
    apiRequest<{ source: KnowledgeSource }>("knowledge/faq", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        language: input.language,
        items: input.faqItems,
      }),
    }),

  createFile: (formData: FormData) =>
    apiRequest<{ source: KnowledgeSource }>("knowledge/files", {
      method: "POST",
      body: formData,
      timeoutMs: 45_000,
    }),

  update: (id: string, input: UpdateKnowledgeInput) =>
    apiRequest<{ source: KnowledgeSource }>(
      `knowledge/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),

  archive: (id: string) =>
    apiRequest<{ source: KnowledgeSource }>(
      `knowledge/${encodeURIComponent(id)}/archive`,
      { method: "POST" },
    ),

  remove: (id: string) =>
    apiRequest<{ deleted: true }>(`knowledge/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  sync: (id: string) =>
    apiRequest<{ knowledge: KnowledgeSource; sync: KnowledgeSyncResult }>(
      `knowledge/${encodeURIComponent(id)}/sync`,
      { method: "POST", timeoutMs: 45_000 },
    ),

  resync: (id: string) =>
    apiRequest<{ knowledge: KnowledgeSource; sync: KnowledgeSyncResult }>(
      `knowledge/${encodeURIComponent(id)}/resync`,
      { method: "POST", timeoutMs: 45_000 },
    ),

  providerStatus: (id: string) =>
    apiRequest<{ status: KnowledgeProviderStatus }>(
      `knowledge/${encodeURIComponent(id)}/provider-status`,
      { timeoutMs: 20_000 },
    ),

  listAgentKnowledge: (agentId: string) =>
    apiRequest<{ assignments: AgentKnowledgeAssignment[] }>(
      `agents/${encodeURIComponent(agentId)}/knowledge`,
    ),

  assignToAgent: (agentId: string, knowledgeId: string) =>
    apiRequest<{ assignment: AgentKnowledgeAssignment }>(
      `agents/${encodeURIComponent(agentId)}/knowledge/${encodeURIComponent(knowledgeId)}`,
      { method: "POST" },
    ),

  unassignFromAgent: (agentId: string, knowledgeId: string) =>
    apiRequest<{ deleted: true }>(
      `agents/${encodeURIComponent(agentId)}/knowledge/${encodeURIComponent(knowledgeId)}`,
      { method: "DELETE" },
    ),
};