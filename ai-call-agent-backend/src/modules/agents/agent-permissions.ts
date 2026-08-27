import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type AgentAction =
  | 'list_agents'
  | 'view_agent'
  | 'create_agent'
  | 'update_agent'
  | 'activate_agent'
  | 'archive_agent'
  | 'delete_agent';

const MATRIX: Record<AgentAction, OrganizationMemberRole[]> = {
  list_agents: ['owner', 'admin', 'manager', 'viewer'],
  view_agent: ['owner', 'admin', 'manager', 'viewer'],
  create_agent: ['owner', 'admin', 'manager'],
  update_agent: ['owner', 'admin', 'manager'],
  activate_agent: ['owner', 'admin', 'manager'],
  archive_agent: ['owner', 'admin'],
  delete_agent: ['owner', 'admin'],
};

export function assertAgentCan(
  actorRole: OrganizationMemberRole,
  action: AgentAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function canAgentAction(
  actorRole: OrganizationMemberRole,
  action: AgentAction,
): boolean {
  return MATRIX[action].includes(actorRole);
}
