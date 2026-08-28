import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type CallAction = 'list_calls' | 'view_call';

const MATRIX: Record<CallAction, OrganizationMemberRole[]> = {
  list_calls: ['owner', 'admin', 'manager', 'viewer'],
  view_call: ['owner', 'admin', 'manager', 'viewer'],
};

export function assertCallCan(
  role: OrganizationMemberRole,
  action: CallAction,
): void {
  if (!MATRIX[action].includes(role)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function canViewProviderLinks(
  role: OrganizationMemberRole,
): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager';
}
