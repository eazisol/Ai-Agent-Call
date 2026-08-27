import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { AuthSessionResult } from './auth.service';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}

  accessCookieName(): string {
    return this.config.get<string>('auth.accessCookieName') ?? 'eazi_access';
  }

  refreshCookieName(): string {
    return this.config.get<string>('auth.refreshCookieName') ?? 'eazi_refresh';
  }

  setSession(response: Response, session: AuthSessionResult): void {
    response.cookie(
      this.accessCookieName(),
      session.accessToken,
      this.cookieOptions(this.config.get<number>('auth.accessTtlSeconds') ?? 900),
    );
    response.cookie(
      this.refreshCookieName(),
      session.refreshToken,
      this.cookieOptions(
        this.config.get<number>('auth.refreshTtlSeconds') ?? 2_592_000,
      ),
    );
  }

  clearSession(response: Response): void {
    response.clearCookie(this.accessCookieName(), this.cookieOptions(0));
    response.clearCookie(this.refreshCookieName(), this.cookieOptions(0));
    this.clearActiveOrganization(response);
  }

  activeOrganizationCookieName(): string {
    return this.config.get<string>('auth.orgCookieName') ?? 'eazi_org';
  }

  setActiveOrganization(response: Response, organizationId: string): void {
    response.cookie(
      this.activeOrganizationCookieName(),
      organizationId,
      this.cookieOptions(
        this.config.get<number>('auth.refreshTtlSeconds') ?? 2_592_000,
      ),
    );
    // Businesses are org-scoped; switching workspace invalidates prior business.
    this.clearActiveBusiness(response);
  }

  clearActiveOrganization(response: Response): void {
    response.clearCookie(
      this.activeOrganizationCookieName(),
      this.cookieOptions(0),
    );
    this.clearActiveBusiness(response);
  }

  activeBusinessCookieName(): string {
    return this.config.get<string>('auth.bizCookieName') ?? 'eazi_biz';
  }

  setActiveBusiness(response: Response, businessId: string): void {
    response.cookie(
      this.activeBusinessCookieName(),
      businessId,
      this.cookieOptions(
        this.config.get<number>('auth.refreshTtlSeconds') ?? 2_592_000,
      ),
    );
  }

  clearActiveBusiness(response: Response): void {
    response.clearCookie(
      this.activeBusinessCookieName(),
      this.cookieOptions(0),
    );
  }

  private cookieOptions(maxAgeSeconds: number): CookieOptions {
    const secure =
      this.config.get<boolean>('auth.cookieSecure') ??
      this.config.get<string>('app.nodeEnv') === 'production';
    const sameSite =
      (this.config.get<'lax' | 'strict' | 'none'>('auth.cookieSameSite') ??
        (secure ? 'none' : 'lax')) as CookieOptions['sameSite'];

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: Math.max(maxAgeSeconds, 0) * 1000,
    };
  }
}
