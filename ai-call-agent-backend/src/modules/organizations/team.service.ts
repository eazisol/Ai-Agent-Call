import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  EMAIL_DELIVERY_PORT,
  type EmailDeliveryPort,
} from '../../providers/email-delivery.port';
import { AuthTokenService } from '../auth/auth-token.service';
import { User } from '../auth/entities/user.entity';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import {
  type InviteAssignableRole,
  OrganizationMember,
  type OrganizationMemberRole,
} from './entities/organization-member.entity';
import {
  assertCan,
  canAssignRole,
  canManageTarget,
  canRemoveMember,
  isInviteAssignableRole,
} from './organization-permissions';
import { OrganizationsService } from './organizations.service';

export interface MemberView {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationView {
  id: string;
  email: string;
  role: InviteAssignableRole;
  invitedByUserId: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export type InvitationPreviewStatus =
  | 'valid'
  | 'expired'
  | 'cancelled'
  | 'accepted'
  | 'invalid';

export type InvitationAccountState = 'existing' | 'new';

export interface InvitationPreviewView {
  status: InvitationPreviewStatus;
  organizationId: string | null;
  organizationName: string | null;
  /** Exact invited email — only returned when the invite token hash matches. */
  invitedEmail: string | null;
  emailMasked: string | null;
  role: InviteAssignableRole | null;
  invitedByDisplayName: string | null;
  expiresAt: Date | null;
  expired: boolean;
  /** Only set when the invitation token hash matched a real invite row. */
  accountState: InvitationAccountState | null;
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly organizations: OrganizationsService,
    private readonly tokens: AuthTokenService,
    private readonly config: ConfigService,
    @Inject(EMAIL_DELIVERY_PORT)
    private readonly emailDelivery: EmailDeliveryPort,
    @InjectRepository(OrganizationMember)
    private readonly members: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private readonly invitations: Repository<OrganizationInvitation>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async listMembers(
    actorUserId: string,
    organizationId: string,
  ): Promise<MemberView[]> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'list_members');

    const rows = await this.members.find({
      where: { organization: { id: organizationId } },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    return rows.map((row) => this.toMemberView(row));
  }

  async listInvitations(
    actorUserId: string,
    organizationId: string,
  ): Promise<InvitationView[]> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'list_invitations');

    const rows = await this.invitations.find({
      where: {
        organization: { id: organizationId },
        consumedAt: IsNull(),
        cancelledAt: IsNull(),
      },
      relations: { invitedBy: true },
      order: { createdAt: 'DESC' },
    });

    return rows
      .filter((row) => row.expiresAt.getTime() > Date.now())
      .map((row) => this.toInvitationView(row));
  }

  async createInvitation(
    actorUserId: string,
    organizationId: string,
    input: { email: string; role: string },
  ): Promise<InvitationView> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'invite');

    if (!isInviteAssignableRole(input.role)) {
      throw new ApplicationError(
        'INVALID_INVITATION_ROLE',
        'Invitations may only assign admin, manager, or viewer.',
      );
    }
    if (!canAssignRole(actor.role, input.role)) {
      throw new ApplicationError(
        'FORBIDDEN',
        'You cannot invite a member with that role.',
        403,
      );
    }

    const email = this.normalizeEmail(input.email);
    if (!email || !email.includes('@')) {
      throw new ApplicationError(
        'INVALID_INVITATION_EMAIL',
        'A valid invitation email is required.',
      );
    }

    const existingMember = await this.members
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.user', 'user')
      .where('member.organization_id = :organizationId', { organizationId })
      .andWhere('user.email = :email', { email })
      .getOne();
    if (existingMember) {
      throw new ApplicationError(
        'ALREADY_A_MEMBER',
        'That user is already a member of this organization.',
        409,
      );
    }

    // Resend policy: cancel any active pending invite for same org+email, then create.
    await this.invitations
      .createQueryBuilder()
      .update(OrganizationInvitation)
      .set({ cancelledAt: new Date() })
      .where('organization_id = :organizationId', { organizationId })
      .andWhere('email = :email', { email })
      .andWhere('consumed_at IS NULL')
      .andWhere('cancelled_at IS NULL')
      .execute();

    const rawToken = this.tokens.createOpaqueToken();
    const invitedBy = await this.users.findOne({ where: { id: actorUserId } });
    const invitation = await this.invitations.save(
      this.invitations.create({
        organization: actor.organization,
        email,
        role: input.role,
        tokenHash: this.tokens.hashOpaqueToken(rawToken),
        invitedBy: invitedBy ?? null,
        expiresAt: this.inviteExpiresAt(),
        consumedAt: null,
        cancelledAt: null,
      }),
    );

    const link = this.appLink('/invitations/accept', rawToken);
    const inviterName = invitedBy?.displayName?.trim() || 'A teammate';
    const orgName = actor.organization.name;
    const roleLabel = input.role;
    const expiresLabel = invitation.expiresAt.toUTCString();
    try {
      await this.emailDelivery.send({
        to: email,
        subject: `You're invited to join ${orgName} on EaziAICall`,
        text: [
          `${inviterName} invited you to join ${orgName} on EaziAICall.`,
          ``,
          `Your role: ${roleLabel}`,
          ``,
          `Accept this invitation: ${link}`,
          ``,
          `This invitation expires on ${expiresLabel}.`,
          ``,
          `If you were not expecting this email, you can ignore it.`,
        ].join('\n'),
        html: [
          `<p><strong>${this.escapeHtml(inviterName)}</strong> invited you to join <strong>${this.escapeHtml(orgName)}</strong> on EaziAICall.</p>`,
          `<p>Your role: <strong>${this.escapeHtml(roleLabel)}</strong></p>`,
          `<p><a href="${link}">Accept invitation</a></p>`,
          `<p style="color:#64748b;font-size:13px">This invitation expires on ${this.escapeHtml(expiresLabel)}.</p>`,
          `<p style="color:#64748b;font-size:13px">If you were not expecting this email, you can ignore it.</p>`,
          `<p style="color:#94a3b8;font-size:12px">If the button does not work, open this link:<br/>${this.escapeHtml(link)}</p>`,
        ].join(''),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email for org ${organizationId}`,
        error instanceof Error ? error.stack : undefined,
      );
      invitation.cancelledAt = new Date();
      await this.invitations.save(invitation);
      throw new ApplicationError(
        'INVITATION_EMAIL_FAILED',
        'Invitation could not be delivered. Please try again later.',
        502,
      );
    }

    this.logger.log(
      `Created invitation ${invitation.id} for org ${organizationId}`,
    );
    return this.toInvitationView(invitation);
  }

  async cancelInvitation(
    actorUserId: string,
    organizationId: string,
    invitationId: string,
  ): Promise<{ cancelled: true }> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'cancel_invitation');

    const invitation = await this.invitations.findOne({
      where: {
        id: invitationId,
        organization: { id: organizationId },
      },
    });
    if (!invitation || invitation.cancelledAt || invitation.consumedAt) {
      throw new ApplicationError(
        'INVITATION_NOT_FOUND',
        'Invitation not found.',
        404,
      );
    }

    invitation.cancelledAt = new Date();
    await this.invitations.save(invitation);
    return { cancelled: true };
  }

  async changeMemberRole(
    actorUserId: string,
    organizationId: string,
    memberId: string,
    role: string,
  ): Promise<MemberView> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'change_role');

    if (
      role !== 'admin' &&
      role !== 'manager' &&
      role !== 'viewer' &&
      role !== 'owner'
    ) {
      throw new ApplicationError(
        'INVALID_MEMBER_ROLE',
        'Role must be owner, admin, manager, or viewer.',
      );
    }

    const target = await this.members.findOne({
      where: { id: memberId, organization: { id: organizationId } },
      relations: { user: true, organization: true },
    });
    if (!target) {
      throw new ApplicationError(
        'MEMBER_NOT_FOUND',
        'Organization member not found.',
        404,
      );
    }

    if (target.user.id === actorUserId) {
      throw new ApplicationError(
        'FORBIDDEN',
        'You cannot change your own role. Use ownership transfer if needed.',
        403,
      );
    }

    if (!canManageTarget(actor.role, target.role)) {
      throw new ApplicationError(
        'FORBIDDEN',
        'You cannot change this member’s role.',
        403,
      );
    }

    if (!canAssignRole(actor.role, role)) {
      throw new ApplicationError(
        'FORBIDDEN',
        'You cannot assign that role.',
        403,
      );
    }

    if (role === 'owner') {
      throw new ApplicationError(
        'FORBIDDEN',
        'Use ownership transfer to assign the owner role.',
        403,
      );
    }

    target.role = role;
    const saved = await this.members.save(target);
    return this.toMemberView(saved);
  }

  async removeMember(
    actorUserId: string,
    organizationId: string,
    memberId: string,
  ): Promise<{ removed: true }> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'remove_member');

    const target = await this.members.findOne({
      where: { id: memberId, organization: { id: organizationId } },
      relations: { user: true },
    });
    if (!target) {
      throw new ApplicationError(
        'MEMBER_NOT_FOUND',
        'Organization member not found.',
        404,
      );
    }

    if (target.role === 'owner') {
      const ownerCount = await this.members.count({
        where: {
          organization: { id: organizationId },
          role: 'owner',
        },
      });
      if (ownerCount <= 1) {
        throw new ApplicationError(
          'LAST_OWNER',
          'Cannot remove the last owner. Transfer ownership first.',
          409,
        );
      }
    }

    if (!canRemoveMember(actor.role, target.role)) {
      throw new ApplicationError(
        'FORBIDDEN',
        'You cannot remove this member.',
        403,
      );
    }

    await this.members.remove(target);
    return { removed: true };
  }

  async transferOwnership(
    actorUserId: string,
    organizationId: string,
    targetMemberId: string,
  ): Promise<{ previousOwner: MemberView; newOwner: MemberView }> {
    const actor = await this.organizations.requireMembership(
      actorUserId,
      organizationId,
    );
    assertCan(actor.role, 'transfer_ownership');

    if (actor.role !== 'owner') {
      throw new ApplicationError(
        'FORBIDDEN',
        'Only the current owner can transfer ownership.',
        403,
      );
    }

    const target = await this.members.findOne({
      where: { id: targetMemberId, organization: { id: organizationId } },
      relations: { user: true, organization: true },
    });
    if (!target) {
      throw new ApplicationError(
        'MEMBER_NOT_FOUND',
        'Organization member not found.',
        404,
      );
    }
    if (target.user.id === actorUserId) {
      throw new ApplicationError(
        'INVALID_TRANSFER',
        'Cannot transfer ownership to yourself.',
      );
    }
    if (target.role === 'owner') {
      throw new ApplicationError(
        'INVALID_TRANSFER',
        'That member is already an owner.',
      );
    }

    target.role = 'owner';
    actor.role = 'admin';
    const [newOwner, previousOwner] = await this.members.save([target, actor]);
    // Reload with user relation for previous owner view
    const previousWithUser = await this.members.findOne({
      where: { id: previousOwner.id },
      relations: { user: true },
    });
    const newWithUser = await this.members.findOne({
      where: { id: newOwner.id },
      relations: { user: true },
    });

    this.logger.log(
      `Transferred ownership of org ${organizationId} to member ${targetMemberId}`,
    );

    return {
      previousOwner: this.toMemberView(previousWithUser ?? previousOwner),
      newOwner: this.toMemberView(newWithUser ?? newOwner),
    };
  }

  async previewInvitation(rawToken: string): Promise<InvitationPreviewView> {
    if (!rawToken?.trim()) {
      return this.emptyPreview('invalid');
    }

    const invitation = await this.invitations.findOne({
      where: { tokenHash: this.tokens.hashOpaqueToken(rawToken.trim()) },
      relations: { organization: true, invitedBy: true },
    });

    if (!invitation || !invitation.organization) {
      return this.emptyPreview('invalid');
    }

    let status: InvitationPreviewStatus = 'valid';
    if (invitation.cancelledAt) {
      status = 'cancelled';
    } else if (invitation.consumedAt) {
      status = 'accepted';
    } else if (invitation.expiresAt.getTime() <= Date.now()) {
      status = 'expired';
    }

    const existingUser = await this.users.findOne({
      where: { email: invitation.email },
    });

    return {
      status,
      organizationId: invitation.organization.id,
      organizationName: invitation.organization.name,
      invitedEmail: invitation.email,
      emailMasked: this.maskEmail(invitation.email),
      role: invitation.role,
      invitedByDisplayName: invitation.invitedBy?.displayName?.trim() || null,
      expiresAt: invitation.expiresAt,
      expired: status === 'expired',
      accountState: existingUser ? 'existing' : 'new',
    };
  }

  async acceptInvitation(
    actorUserId: string,
    rawToken: string,
  ): Promise<{
    member: MemberView;
    organizationId: string;
    alreadyMember: boolean;
  }> {
    const user = await this.users.findOne({ where: { id: actorUserId } });
    if (!user) {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication required.',
        401,
      );
    }

    const invitation = await this.findAcceptableInvitation(rawToken);
    if (this.normalizeEmail(user.email) !== invitation.email) {
      throw new ApplicationError(
        'INVITATION_EMAIL_MISMATCH',
        'Signed-in email does not match this invitation.',
        403,
      );
    }

    const already = await this.members.findOne({
      where: {
        user: { id: user.id },
        organization: { id: invitation.organization.id },
      },
      relations: { user: true },
    });
    if (already) {
      if (!invitation.consumedAt) {
        invitation.consumedAt = new Date();
        await this.invitations.save(invitation);
      }
      return {
        member: this.toMemberView(already),
        organizationId: invitation.organization.id,
        alreadyMember: true,
      };
    }

    let member: OrganizationMember;
    try {
      member = await this.members.save(
        this.members.create({
          organization: invitation.organization,
          user,
          role: invitation.role,
        }),
      );
    } catch {
      const raced = await this.members.findOne({
        where: {
          user: { id: user.id },
          organization: { id: invitation.organization.id },
        },
        relations: { user: true },
      });
      if (!raced) {
        throw new ApplicationError(
          'INVITATION_ACCEPT_FAILED',
          'Could not join this team. Please try again.',
          500,
        );
      }
      if (!invitation.consumedAt) {
        invitation.consumedAt = new Date();
        await this.invitations.save(invitation);
      }
      return {
        member: this.toMemberView(raced),
        organizationId: invitation.organization.id,
        alreadyMember: true,
      };
    }

    invitation.consumedAt = new Date();
    await this.invitations.save(invitation);

    const withUser = await this.members.findOne({
      where: { id: member.id },
      relations: { user: true },
    });

    this.logger.log(
      `User ${user.id} accepted invitation ${invitation.id} into org ${invitation.organization.id}`,
    );

    return {
      member: this.toMemberView(withUser ?? member),
      organizationId: invitation.organization.id,
      alreadyMember: false,
    };
  }

  private emptyPreview(status: InvitationPreviewStatus): InvitationPreviewView {
    return {
      status,
      organizationId: null,
      organizationName: null,
      invitedEmail: null,
      emailMasked: null,
      role: null,
      invitedByDisplayName: null,
      expiresAt: null,
      expired: status === 'expired',
      accountState: null,
    };
  }

  private async findAcceptableInvitation(
    rawToken: string,
  ): Promise<OrganizationInvitation> {
    if (!rawToken?.trim()) {
      throw new ApplicationError(
        'INVALID_INVITATION_TOKEN',
        'Invitation token is required.',
      );
    }

    const invitation = await this.invitations.findOne({
      where: { tokenHash: this.tokens.hashOpaqueToken(rawToken.trim()) },
      relations: { organization: true },
    });

    if (!invitation || !invitation.organization) {
      throw new ApplicationError(
        'INVALID_INVITATION_TOKEN',
        'Invitation token is invalid or no longer valid.',
        400,
      );
    }

    if (invitation.cancelledAt) {
      throw new ApplicationError(
        'INVITATION_CANCELLED',
        'This invitation was cancelled.',
        400,
      );
    }

    if (invitation.consumedAt) {
      throw new ApplicationError(
        'INVITATION_ALREADY_ACCEPTED',
        'This invitation has already been accepted.',
        400,
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new ApplicationError(
        'INVITATION_EXPIRED',
        'This invitation has expired.',
        400,
      );
    }

    if (!isInviteAssignableRole(invitation.role)) {
      throw new ApplicationError(
        'INVALID_INVITATION_ROLE',
        'This invitation has an invalid role.',
        400,
      );
    }

    return invitation;
  }

  private inviteExpiresAt(): Date {
    const ttl = this.config.get<number>('auth.inviteTtlSeconds') ?? 604_800;
    return new Date(Date.now() + ttl * 1000);
  }

  private appLink(path: string, token: string): string {
    const base =
      this.config.get<string>('auth.publicAppUrl') ?? 'http://localhost:3001';
    const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) {
      return '***';
    }
    const visible = local.slice(0, 1);
    return `${visible}***@${domain}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private toMemberView(member: OrganizationMember): MemberView {
    return {
      id: member.id,
      userId: member.user?.id ?? '',
      email: member.user?.email ?? '',
      displayName: member.user?.displayName ?? '',
      role: member.role,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  private toInvitationView(invitation: OrganizationInvitation): InvitationView {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitedByUserId: invitation.invitedBy?.id ?? null,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }
}
