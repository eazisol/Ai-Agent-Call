import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type KnowledgeAction =
  | 'list_knowledge'
  | 'view_knowledge'
  | 'create_knowledge'
  | 'update_knowledge'
  | 'archive_knowledge'
  | 'delete_knowledge'
  | 'assign_knowledge'
  | 'list_agent_knowledge';

const MATRIX: Record<KnowledgeAction, OrganizationMemberRole[]> = {
  list_knowledge: ['owner', 'admin', 'manager', 'viewer'],
  view_knowledge: ['owner', 'admin', 'manager', 'viewer'],
  create_knowledge: ['owner', 'admin', 'manager'],
  update_knowledge: ['owner', 'admin', 'manager'],
  archive_knowledge: ['owner', 'admin'],
  delete_knowledge: ['owner', 'admin'],
  assign_knowledge: ['owner', 'admin', 'manager'],
  list_agent_knowledge: ['owner', 'admin', 'manager', 'viewer'],
};

export function assertKnowledgeCan(
  actorRole: OrganizationMemberRole,
  action: KnowledgeAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function canKnowledgeAction(
  actorRole: OrganizationMemberRole,
  action: KnowledgeAction,
): boolean {
  return MATRIX[action].includes(actorRole);
}
