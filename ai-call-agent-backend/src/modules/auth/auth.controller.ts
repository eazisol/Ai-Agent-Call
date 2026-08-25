import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from './auth-cookie.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import {
  type AuthenticatedRequest,
  readCookie,
} from './auth-request';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  async register(@Body() body: RegisterDto) {
    const result = await this.auth.register(body);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(body);
    this.cookies.setSession(response, session);
    return { user: session.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readCookie(
      request,
      this.cookies.refreshCookieName(),
    );
    await this.auth.logout(refreshToken);
    this.cookies.clearSession(response);
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.token, body.password);
  }

  @Post('verify-email')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const result = await this.auth.verifyEmail(body.token);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(AuthRateLimitGuard)
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readCookie(
      request,
      this.cookies.refreshCookieName(),
    );
    if (!refreshToken) {
      this.cookies.clearSession(response);
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication required.',
        401,
      );
    }
    const session = await this.auth.refreshSession(refreshToken);
    this.cookies.setSession(response, session);
    return { user: session.user };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.authUser };
  }
}
