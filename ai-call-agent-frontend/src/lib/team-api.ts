import { apiRequest } from "./api-client";

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

function orgPath(organizationId: string, suffix: string): string {
  return `organizations/${encodeURIComponent(organizationId)}${suffix}`;
}

/** Team / invitations client — cookie session; no token logging. */
export const teamApi = {
  listMembers: (organizationId: string) =>
    apiRequest<{ members: TeamMember[] }>(orgPath(organizationId, "/members")),

  changeMemberRole: (
    organizationId: string,
    memberId: string,
    role: InviteAssignableRole,
  ) =>
    apiRequest<{ member: TeamMember }>(
      orgPath(organizationId, `/members/${encodeURIComponent(memberId)}`),
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    ),

  removeMember: (organizationId: string, memberId: string) =>
    apiRequest<{ removed: true }>(
      orgPath(organizationId, `/members/${encodeURIComponent(memberId)}`),
      { method: "DELETE" },
    ),

  listInvitations: (organizationId: string) =>
    apiRequest<{ invitations: TeamInvitation[] }>(
      orgPath(organizationId, "/invitations"),
    ),

  createInvitation: (
    organizationId: string,
    input: { email: string; role: InviteAssignableRole },
  ) =>
    apiRequest<{ invitation: TeamInvitation }>(
      orgPath(organizationId, "/invitations"),
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  cancelInvitation: (organizationId: string, invitationId: string) =>
    apiRequest<{ cancelled: true }>(
      orgPath(
        organizationId,
        `/invitations/${encodeURIComponent(invitationId)}`,
      ),
      { method: "DELETE" },
    ),

  transferOwnership: (organizationId: string, memberId: string) =>
    apiRequest<{ previousOwner: TeamMember; newOwner: TeamMember }>(
      orgPath(organizationId, "/transfer-ownership"),
      {
        method: "POST",
        body: JSON.stringify({ memberId }),
      },
    ),

  previewInvitation: (token: string) =>
    apiRequest<{ invitation: InvitationPreview }>(
      `invitations/preview?token=${encodeURIComponent(token)}`,
    ),

  acceptInvitation: (token: string) =>
    apiRequest<{
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
