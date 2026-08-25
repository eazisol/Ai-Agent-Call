import { ApplicationError } from '../../common/errors/application-error';
import type {
  InviteAssignableRole,
  OrganizationMemberRole,
} from './entities/organization-member.entity';

export type TeamAction =
  | 'list_members'
  | 'list_invitations'
  | 'invite'
  | 'change_role'
  | 'remove_member'
  | 'cancel_invitation'
  | 'transfer_ownership'
  | 'update_organization';

const MATRIX: Record<TeamAction, OrganizationMemberRole[]> = {
  list_members: ['owner', 'admin', 'manager', 'viewer'],
  list_invitations: ['owner', 'admin'],
  invite: ['owner', 'admin'],
  change_role: ['owner', 'admin'],
  remove_member: ['owner', 'admin'],
  cancel_invitation: ['owner', 'admin'],
  transfer_ownership: ['owner'],
  update_organization: ['owner', 'admin'],
};

export function assertCan(
  actorRole: OrganizationMemberRole,
  action: TeamAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function isInviteAssignableRole(
  role: string,
): role is InviteAssignableRole {
  return role === 'admin' || role === 'manager' || role === 'viewer';
}

export function canAssignRole(
  actorRole: OrganizationMemberRole,
  targetRole: OrganizationMemberRole,
): boolean {
  if (targetRole === 'owner') {
    return false;
  }
  if (actorRole === 'owner') {
    return (
      targetRole === 'admin' ||
      targetRole === 'manager' ||
      targetRole === 'viewer'
    );
  }
  if (actorRole === 'admin') {
    return targetRole === 'manager' || targetRole === 'viewer';
  }
  return false;
}

export function canRemoveMember(
  actorRole: OrganizationMemberRole,
  targetRole: OrganizationMemberRole,
): boolean {
  if (targetRole === 'owner') {
    return false;
  }
  if (actorRole === 'owner') {
    return true;
  }
  if (actorRole === 'admin') {
    return targetRole === 'manager' || targetRole === 'viewer';
  }
  return false;
}

export function canManageTarget(
  actorRole: OrganizationMemberRole,
  targetRole: OrganizationMemberRole,
): boolean {
  if (actorRole === 'owner') {
    return targetRole !== 'owner';
  }
  if (actorRole === 'admin') {
    return targetRole === 'manager' || targetRole === 'viewer';
  }
  return false;
}
