import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

interface VoiceStreamClaims {
  callSid: string;
  exp: number;
  nonce: string;
}

@Injectable()
export class VoiceStreamTokenService {
  constructor(private readonly config: ConfigService) {}

  create(callSid: string): string {
    const ttl = this.config.get<number>('voiceStream.tokenTtlSeconds') ?? 120;
    const claims: VoiceStreamClaims = {
      callSid,
      exp: Math.floor(Date.now() / 1000) + ttl,
      nonce: randomBytes(12).toString('hex'),
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  verify(token: string, expectedCallSid: string): boolean {
    const [payload, suppliedSignature] = token.split('.');
    if (!payload || !suppliedSignature) {
      return false;
    }

    const expectedSignature = this.sign(payload);
    const supplied = Buffer.from(suppliedSignature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return false;
    }

    try {
      const claims = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as VoiceStreamClaims;
      return (
        claims.callSid === expectedCallSid &&
        Number.isInteger(claims.exp) &&
        claims.exp >= Math.floor(Date.now() / 1000) &&
        typeof claims.nonce === 'string' &&
        claims.nonce.length >= 16
      );
    } catch {
      return false;
    }
  }

  private sign(payload: string): string {
    const secret = this.config.getOrThrow<string>('voiceStream.signingSecret');
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }
}
