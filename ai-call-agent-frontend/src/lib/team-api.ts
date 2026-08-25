import { buildApiUrl } from "./api-url.mjs";

export type OrganizationMemberRole =
  | "owner"
  | "admin"
  | "manager"
  | "viewer";

export type InviteAssignableRole = "admin" | "manager" | "viewer";

export type TeamMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationMemberRole;
  createdAt: string;
  updatedAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: InviteAssignableRole;
  invitedByUserId: string | null;
  expiresAt: string;
  createdAt: string;
};

export type InvitationPreviewStatus =
  | "valid"
  | "expired"
  | "cancelled"
  | "accepted"
  | "invalid";

export type InvitationAccountState = "existing" | "new";

export type InvitationPreview = {
  status: InvitationPreviewStatus;
  organizationId: string | null;
  organizationName: string | null;
  invitedEmail: string | null;
  emailMasked: string | null;
  role: InviteAssignableRole | null;
  invitedByDisplayName: string | null;
  expiresAt: string | null;
  expired: boolean;
  accountState: InvitationAccountState | null;
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
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers,
      signal: init?.signal ?? AbortSignal.timeout(15_000),
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

function orgPath(organizationId: string, suffix: string): string {
  return `organizations/${encodeURIComponent(organizationId)}${suffix}`;
}

/** Team / invitations client — cookie session; no token logging. */
export const teamApi = {
  listMembers: (organizationId: string) =>
    request<{ members: TeamMember[] }>(orgPath(organizationId, "/members")),

  changeMemberRole: (
    organizationId: string,
    memberId: string,
    role: InviteAssignableRole,
  ) =>
    request<{ member: TeamMember }>(
      orgPath(organizationId, `/members/${encodeURIComponent(memberId)}`),
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    ),

  removeMember: (organizationId: string, memberId: string) =>
    request<{ removed: true }>(
      orgPath(organizationId, `/members/${encodeURIComponent(memberId)}`),
      { method: "DELETE" },
    ),

  listInvitations: (organizationId: string) =>
    request<{ invitations: TeamInvitation[] }>(
      orgPath(organizationId, "/invitations"),
    ),

  createInvitation: (
    organizationId: string,
    input: { email: string; role: InviteAssignableRole },
  ) =>
    request<{ invitation: TeamInvitation }>(
      orgPath(organizationId, "/invitations"),
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  cancelInvitation: (organizationId: string, invitationId: string) =>
    request<{ cancelled: true }>(
      orgPath(
        organizationId,
        `/invitations/${encodeURIComponent(invitationId)}`,
      ),
      { method: "DELETE" },
    ),

  transferOwnership: (organizationId: string, memberId: string) =>
    request<{ previousOwner: TeamMember; newOwner: TeamMember }>(
      orgPath(organizationId, "/transfer-ownership"),
      {
        method: "POST",
        body: JSON.stringify({ memberId }),
      },
    ),

  previewInvitation: (token: string) =>
    request<{ invitation: InvitationPreview }>(
      `invitations/preview?token=${encodeURIComponent(token)}`,
    ),

  acceptInvitation: (token: string) =>
    request<{
      member: TeamMember;
      organizationId: string;
      alreadyMember: boolean;
    }>("invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};

export function canInviteMembers(role: OrganizationMemberRole): boolean {
  return role === "owner" || role === "admin";
}

export function canManageInvitations(role: OrganizationMemberRole): boolean {
  return role === "owner" || role === "admin";
}

export function inviteRolesForActor(
  actorRole: OrganizationMemberRole,
): InviteAssignableRole[] {
  if (actorRole === "owner") {
    return ["admin", "manager", "viewer"];
  }
  if (actorRole === "admin") {
    return ["manager", "viewer"];
  }
  return [];
}

export function canChangeMemberRole(
  actorRole: OrganizationMemberRole,
  targetRole: OrganizationMemberRole,
  isSelf: boolean,
): boolean {
  if (isSelf) {
    return false;
  }
  if (actorRole === "owner") {
    return targetRole !== "owner";
  }
  if (actorRole === "admin") {
    return targetRole === "manager" || targetRole === "viewer";
  }
  return false;
}

export function canRemoveMemberUi(
  actorRole: OrganizationMemberRole,
  targetRole: OrganizationMemberRole,
): boolean {
  if (targetRole === "owner") {
    return false;
  }
  if (actorRole === "owner") {
    return true;
  }
  if (actorRole === "admin") {
    return targetRole === "manager" || targetRole === "viewer";
  }
  return false;
}

export function assignableRolesForTarget(
  actorRole: OrganizationMemberRole,
  targetRole: OrganizationMemberRole,
): InviteAssignableRole[] {
  if (!canChangeMemberRole(actorRole, targetRole, false)) {
    return [];
  }
  return inviteRolesForActor(actorRole);
}
