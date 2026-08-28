import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

const ALLOWED: OrganizationMemberRole[] = ['owner', 'admin'];

export function assertCanViewTelephonyProviderStatus(
  role: OrganizationMemberRole,
): void {
  if (!ALLOWED.includes(role)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'Only organization owners and admins can view telephony provider status.',
      403,
    );
  }
}
