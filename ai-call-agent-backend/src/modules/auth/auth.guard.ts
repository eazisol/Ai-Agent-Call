import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from './auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from './auth-request';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const accessToken = readCookie(request, this.cookies.accessCookieName());
    if (accessToken) {
      try {
        request.authUser = await this.auth.meFromAccessToken(accessToken);
        return true;
      } catch {
        // Fall through to refresh rotation.
      }
    }

    const refreshToken = readCookie(request, this.cookies.refreshCookieName());
    if (!refreshToken) {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication required.',
        401,
      );
    }

    const session = await this.auth.refreshSession(refreshToken);
    this.cookies.setSession(response, session);
    request.authUser = session.user;
    return true;
  }
}
