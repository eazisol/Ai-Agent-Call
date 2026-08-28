import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';

export type VoiceCloneAction =
  | 'list_voice_clones'
  | 'view_voice_clone'
  | 'create_voice_clone'
  | 'manage_voice_clone_samples'
  | 'record_voice_clone_consent'
  | 'submit_voice_clone'
  | 'revoke_voice_clone'
  | 'delete_voice_clone';

const MATRIX: Record<VoiceCloneAction, OrganizationMemberRole[]> = {
  list_voice_clones: ['owner', 'admin', 'manager', 'viewer'],
  view_voice_clone: ['owner', 'admin', 'manager', 'viewer'],
  create_voice_clone: ['owner', 'admin', 'manager'],
  manage_voice_clone_samples: ['owner', 'admin', 'manager'],
  record_voice_clone_consent: ['owner', 'admin', 'manager'],
  submit_voice_clone: ['owner', 'admin', 'manager'],
  revoke_voice_clone: ['owner', 'admin'],
  delete_voice_clone: ['owner', 'admin'],
};

export function assertVoiceCloneCan(
  actorRole: OrganizationMemberRole,
  action: VoiceCloneAction,
): void {
  if (!MATRIX[action].includes(actorRole)) {
    throw new ApplicationError(
      'FORBIDDEN',
      'You do not have permission to perform this action.',
      403,
    );
  }
}
