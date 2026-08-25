import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ApplicationError } from '../../common/errors/application-error';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly config: ConfigService) {}

  createAccessToken(payload: AccessTokenPayload): string {
    const secret = this.config.getOrThrow<string>('auth.jwtAccessSecret');
    const expiresInSeconds =
      this.config.get<number>('auth.accessTtlSeconds') ?? 900;
    return jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: expiresInSeconds,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const secret = this.config.getOrThrow<string>('auth.jwtAccessSecret');
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;

      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new ApplicationError(
          'INVALID_ACCESS_TOKEN',
          'Access token is invalid.',
          401,
        );
      }

      return { sub: payload.sub, email: payload.email };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError(
        'INVALID_ACCESS_TOKEN',
        'Access token is invalid or expired.',
        401,
      );
    }
  }

  createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashOpaqueToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  refreshExpiresAt(): Date {
    const ttl = this.config.get<number>('auth.refreshTtlSeconds') ?? 2_592_000;
    return new Date(Date.now() + ttl * 1000);
  }

  verificationExpiresAt(): Date {
    const ttl =
      this.config.get<number>('auth.verificationTtlSeconds') ?? 86_400;
    return new Date(Date.now() + ttl * 1000);
  }

  resetExpiresAt(): Date {
    const ttl = this.config.get<number>('auth.resetTtlSeconds') ?? 3_600;
    return new Date(Date.now() + ttl * 1000);
  }
}
