import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../infrastructure/email/email.module';
import { AuthCookieService } from './auth-cookie.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthTokenService } from './auth-token.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { PasswordService } from './password.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      EmailVerificationToken,
      PasswordResetToken,
    ]),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AuthTokenService,
    AuthCookieService,
    AuthGuard,
    AuthRateLimitService,
    AuthRateLimitGuard,
  ],
  exports: [
    AuthService,
    PasswordService,
    AuthTokenService,
    AuthCookieService,
    AuthGuard,
    AuthRateLimitService,
    TypeOrmModule,
  ],
})
export class AuthModule {}
