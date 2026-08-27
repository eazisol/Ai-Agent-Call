import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type BusinessAction =
  | 'list_businesses'
  | 'view_business'
  | 'create_business'
  | 'update_business'
  | 'archive_business'
  | 'delete_business'
  | 'switch_active_business';

const MATRIX: Record<BusinessAction, OrganizationMemberRole[]> = {
  list_businesses: ['owner', 'admin', 'manager', 'viewer'],
  view_business: ['owner', 'admin', 'manager', 'viewer'],
  create_business: ['owner', 'admin', 'manager'],
  update_business: ['owner', 'admin', 'manager'],
  archive_business: ['owner', 'admin'],
  delete_business: ['owner', 'admin'],
  switch_active_business: ['owner', 'admin', 'manager', 'viewer'],
};

export function assertBusinessCan(
  actorRole: OrganizationMemberRole,
  action: BusinessAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function canBusinessAction(
  actorRole: OrganizationMemberRole,
  action: BusinessAction,
): boolean {
  return MATRIX[action].includes(actorRole);
}
