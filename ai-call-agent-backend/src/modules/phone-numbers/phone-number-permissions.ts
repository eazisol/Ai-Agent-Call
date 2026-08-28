import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type PhoneNumberAction =
  | 'list_phone_numbers'
  | 'view_phone_number'
  | 'search_phone_numbers'
  | 'purchase_phone_number'
  | 'import_phone_number'
  | 'assign_phone_number'
  | 'unassign_phone_number'
  | 'release_phone_number';

const MATRIX: Record<PhoneNumberAction, OrganizationMemberRole[]> = {
  list_phone_numbers: ['owner', 'admin', 'manager', 'viewer'],
  view_phone_number: ['owner', 'admin', 'manager', 'viewer'],
  search_phone_numbers: ['owner', 'admin', 'manager'],
  purchase_phone_number: ['owner', 'admin'],
  import_phone_number: ['owner', 'admin'],
  assign_phone_number: ['owner', 'admin', 'manager'],
  unassign_phone_number: ['owner', 'admin', 'manager'],
  release_phone_number: ['owner', 'admin'],
};

export function assertPhoneNumberCan(
  actorRole: OrganizationMemberRole,
  action: PhoneNumberAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function canPhoneNumberAction(
  actorRole: OrganizationMemberRole,
  action: PhoneNumberAction,
): boolean {
  return MATRIX[action].includes(actorRole);
}

export function canViewProviderNumberId(
  actorRole: OrganizationMemberRole,
): boolean {
  return actorRole !== 'viewer';
}
