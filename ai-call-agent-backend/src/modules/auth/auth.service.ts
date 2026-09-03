import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  EMAIL_DELIVERY_PORT,
  type EmailDeliveryPort,
} from '../../providers/email-delivery.port';
import {
  buildAuthAppLink,
  buildVerificationEmailContent,
} from './auth-email-content';
import { AuthTokenService } from './auth-token.service';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { PasswordService } from './password.service';

export interface AuthUserView {
  id: string;
  email: string;
  displayName: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface AuthSessionResult {
  user: AuthUserView;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  returnTo?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokens: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokens: Repository<PasswordResetToken>,
    private readonly passwords: PasswordService,
    private readonly tokens: AuthTokenService,
    @Inject(EMAIL_DELIVERY_PORT)
    private readonly emailDelivery: EmailDeliveryPort,
    private readonly config: ConfigService,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  toUserView(user: User): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  async register(input: RegisterInput): Promise<{ user: AuthUserView }> {
    const email = this.normalizeEmail(input.email);
    const displayName = input.displayName.trim();
    if (!email || !displayName) {
      throw new ApplicationError(
        'INVALID_REGISTRATION',
        'Email and display name are required.',
      );
    }
    if (displayName.length > 120) {
      throw new ApplicationError(
        'INVALID_REGISTRATION',
        'Display name must be at most 120 characters.',
      );
    }

    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      if (!existing.emailVerifiedAt) {
        await this.issueVerificationEmail(existing, input.returnTo);
        throw new ApplicationError(
          'EMAIL_NOT_VERIFIED',
          'Verify your email before signing in. We sent a new verification link.',
          403,
        );
      }
      throw new ApplicationError(
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists.',
        409,
      );
    }

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash,
        displayName,
        emailVerifiedAt: null,
      }),
    );

    await this.issueVerificationEmail(user, input.returnTo);
    this.logger.log(`Registered user ${user.id}`);
    return { user: this.toUserView(user) };
  }

  async login(input: LoginInput): Promise<AuthSessionResult> {
    const email = this.normalizeEmail(input.email);
    const user = await this.users.findOne({ where: { email } });
    const passwordOk =
      user !== null &&
      (await this.passwords.verify(input.password, user.passwordHash));

    if (!user || !passwordOk) {
      throw new ApplicationError(
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
        401,
      );
    }

    if (!user.emailVerifiedAt) {
      await this.issueVerificationEmail(user);
      throw new ApplicationError(
        'EMAIL_NOT_VERIFIED',
        'Verify your email before signing in. We sent a new verification link.',
        403,
      );
    }

    return this.createSession(user);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = this.tokens.hashOpaqueToken(rawRefreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (!stored || stored.revokedAt) {
      return;
    }

    stored.revokedAt = new Date();
    await this.refreshTokens.save(stored);
  }

  async forgotPassword(emailInput: string): Promise<{ accepted: true }> {
    const email = this.normalizeEmail(emailInput);
    const user = await this.users.findOne({ where: { email } });
    if (user) {
      await this.issuePasswordResetEmail(user);
    } else {
      this.logger.log('Password reset requested for unknown email');
    }
    return { accepted: true };
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ reset: true }> {
    const tokenHash = this.tokens.hashOpaqueToken(rawToken);
    const stored = await this.passwordResetTokens.findOne({
      where: {
        tokenHash,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new ApplicationError(
        'INVALID_RESET_TOKEN',
        'Password reset token is invalid or expired.',
        400,
      );
    }

    stored.user.passwordHash = await this.passwords.hash(newPassword);
    stored.consumedAt = new Date();
    await this.users.save(stored.user);
    await this.passwordResetTokens.save(stored);
    await this.revokeAllRefreshTokens(stored.user.id);
    this.logger.log(`Password reset completed for user ${stored.user.id}`);
    return { reset: true };
  }

  async verifyEmail(rawToken: string): Promise<{ user: AuthUserView }> {
    const tokenHash = this.tokens.hashOpaqueToken(rawToken);
    const stored = await this.emailVerificationTokens.findOne({
      where: {
        tokenHash,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (stored) {
      if (!stored.user.emailVerifiedAt) {
        stored.user.emailVerifiedAt = new Date();
        await this.users.save(stored.user);
      }
      stored.consumedAt = new Date();
      await this.emailVerificationTokens.save(stored);
      this.logger.log(`Email verified for user ${stored.user.id}`);
      return { user: this.toUserView(stored.user) };
    }

    // Idempotent revisit: same token already consumed for a verified user.
    // Does not weaken single-use — no new session, no re-issue.
    const prior = await this.emailVerificationTokens.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
    if (prior?.user?.emailVerifiedAt) {
      this.logger.log(
        `Email verification link revisited for already-verified user ${prior.user.id}`,
      );
      return { user: this.toUserView(prior.user) };
    }

    throw new ApplicationError(
      'INVALID_VERIFICATION_TOKEN',
      'Email verification token is invalid or expired.',
      400,
    );
  }

  async meFromAccessToken(accessToken: string): Promise<AuthUserView> {
    const payload = this.tokens.verifyAccessToken(accessToken);
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new ApplicationError(
        'INVALID_ACCESS_TOKEN',
        'Access token is invalid.',
        401,
      );
    }
    return this.toUserView(user);
  }

  async refreshSession(rawRefreshToken: string): Promise<AuthSessionResult> {
    const tokenHash = this.tokens.hashOpaqueToken(rawRefreshToken);
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!stored) {
      throw new ApplicationError(
        'INVALID_REFRESH_TOKEN',
        'Refresh token is invalid.',
        401,
      );
    }

    if (stored.revokedAt) {
      await this.revokeAllRefreshTokens(stored.user.id);
      throw new ApplicationError(
        'REFRESH_TOKEN_REUSE',
        'Refresh token reuse detected. Sign in again.',
        401,
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      stored.revokedAt = new Date();
      await this.refreshTokens.save(stored);
      throw new ApplicationError(
        'INVALID_REFRESH_TOKEN',
        'Refresh token is expired.',
        401,
      );
    }

    if (!stored.user.emailVerifiedAt) {
      throw new ApplicationError(
        'EMAIL_NOT_VERIFIED',
        'Verify your email before signing in.',
        403,
      );
    }

    const session = await this.rotateSession(stored, stored.user);
    return session;
  }

  private async createSession(user: User): Promise<AuthSessionResult> {
    const accessToken = this.tokens.createAccessToken({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = this.tokens.createOpaqueToken();
    await this.refreshTokens.save(
      this.refreshTokens.create({
        user,
        tokenHash: this.tokens.hashOpaqueToken(refreshToken),
        expiresAt: this.tokens.refreshExpiresAt(),
        revokedAt: null,
        replacedById: null,
      }),
    );

    return {
      user: this.toUserView(user),
      accessToken,
      refreshToken,
    };
  }

  private async rotateSession(
    previous: RefreshToken,
    user: User,
  ): Promise<AuthSessionResult> {
    const session = await this.createSession(user);
    previous.revokedAt = new Date();
    const replacement = await this.refreshTokens.findOne({
      where: {
        tokenHash: this.tokens.hashOpaqueToken(session.refreshToken),
      },
    });
    previous.replacedById = replacement?.id ?? null;
    await this.refreshTokens.save(previous);
    return session;
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokens
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private async issueVerificationEmail(
    user: User,
    returnTo?: string,
  ): Promise<void> {
    await this.emailVerificationTokens
      .createQueryBuilder()
      .update(EmailVerificationToken)
      .set({ consumedAt: new Date() })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('consumed_at IS NULL')
      .execute();

    const rawToken = this.tokens.createOpaqueToken();
    await this.emailVerificationTokens.save(
      this.emailVerificationTokens.create({
        user,
        tokenHash: this.tokens.hashOpaqueToken(rawToken),
        expiresAt: this.tokens.verificationExpiresAt(),
        consumedAt: null,
      }),
    );

    const link = this.appLink('/verify-email', rawToken, returnTo);
    const content = buildVerificationEmailContent(link);
    await this.emailDelivery.send({
      to: user.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  }

  private async issuePasswordResetEmail(user: User): Promise<void> {
    await this.passwordResetTokens
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ consumedAt: new Date() })
      .where('user_id = :userId', { userId: user.id })
      .andWhere('consumed_at IS NULL')
      .execute();

    const rawToken = this.tokens.createOpaqueToken();
    await this.passwordResetTokens.save(
      this.passwordResetTokens.create({
        user,
        tokenHash: this.tokens.hashOpaqueToken(rawToken),
        expiresAt: this.tokens.resetExpiresAt(),
        consumedAt: null,
      }),
    );

    const link = this.appLink('/reset-password', rawToken);
    await this.emailDelivery.send({
      to: user.email,
      subject: 'Reset your EaziAiCall password',
      text: `Reset your password by opening this link: ${link}`,
      html: `<p>Reset your password by opening this link:</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  private appLink(path: string, token: string, returnTo?: string): string {
    const base =
      this.config.get<string>('auth.publicAppUrl') ?? 'http://localhost:3001';
    return buildAuthAppLink({
      publicAppUrl: base,
      path,
      token,
      next: this.safeInternalReturnTo(returnTo),
    });
  }

  private safeInternalReturnTo(raw?: string): string | undefined {
    if (!raw) {
      return undefined;
    }
    const value = raw.trim();
    if (!value.startsWith('/') || value.startsWith('//')) {
      return undefined;
    }
    if (value.includes('://') || value.includes('\\')) {
      return undefined;
    }
    return value.slice(0, 512);
  }
}
