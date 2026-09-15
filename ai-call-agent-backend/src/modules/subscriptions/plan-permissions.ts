import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type PlanAction = 'view_plans' | 'view_subscription' | 'view_entitlements';

const PLAN_PERMISSIONS: Record<PlanAction, OrganizationMemberRole[]> = {
  view_plans: ['owner', 'admin', 'manager', 'viewer'],
  view_subscription: ['owner', 'admin', 'manager', 'viewer'],
  view_entitlements: ['owner', 'admin', 'manager', 'viewer'],
};

export function canPlanAction(
  role: OrganizationMemberRole,
  action: PlanAction,
): boolean {
  return PLAN_PERMISSIONS[action].includes(role);
}

export function assertPlanCan(
  role: OrganizationMemberRole,
  action: PlanAction,
): void {
  if (!canPlanAction(role, action)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}
