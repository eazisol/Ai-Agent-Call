import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type VoiceAction =
  | 'list_voices'
  | 'view_voice'
  | 'preview_voice'
  | 'view_agent_voice'
  | 'assign_agent_voice';

const MATRIX: Record<VoiceAction, OrganizationMemberRole[]> = {
  list_voices: ['owner', 'admin', 'manager', 'viewer'],
  view_voice: ['owner', 'admin', 'manager', 'viewer'],
  preview_voice: ['owner', 'admin', 'manager', 'viewer'],
  view_agent_voice: ['owner', 'admin', 'manager', 'viewer'],
  assign_agent_voice: ['owner', 'admin', 'manager'],
};

export function assertVoiceCan(
  actorRole: OrganizationMemberRole,
  action: VoiceAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}

export function canVoiceAction(
  actorRole: OrganizationMemberRole,
  action: VoiceAction,
): boolean {
  return MATRIX[action].includes(actorRole);
}
