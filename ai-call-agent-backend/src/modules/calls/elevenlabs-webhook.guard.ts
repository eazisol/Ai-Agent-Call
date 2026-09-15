import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

type RequestWithRawBody = Request & { rawBody?: Buffer };

/** Official ElevenLabs replay window (see SDK webhooks.constructEvent). */
const TIMESTAMP_TOLERANCE_MS = 30 * 60 * 1000;

@Injectable()
export class ElevenLabsWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.config.get<string>('app.nodeEnv') ?? 'development';
    const secret = (
      this.config.get<string>('inboundCall.elevenLabsWebhookSecret') ?? ''
    ).trim();

    if (!secret) {
      if (nodeEnv === 'production') {
        throw new UnauthorizedException(
          'ElevenLabs webhook secret is not configured.',
        );
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithRawBody>();
    const signatureHeader = this.readSignatureHeader(request);
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    if (!this.verifyOfficialSignature(signatureHeader, rawBody, secret)) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    return true;
  }

  /**
   * Official contract:
   * header ElevenLabs-Signature: t=<unix>,v0=<hex>[,v0=<hex>...]
   * signed message: `${t}.${rawBodyUtf8}`
   * HMAC-SHA256 hex; any matching v0 is valid; 30-minute timestamp window.
   */
  private verifyOfficialSignature(
    signatureHeader: string,
    rawBody: Buffer,
    secret: string,
  ): boolean {
    if (!signatureHeader.trim()) {
      return false;
    }

    const parts = signatureHeader.split(',').map((part) => part.trim());
    const timestamp = parts
      .find((part) => part.startsWith('t='))
      ?.slice(2)
      ?.trim();
    const providedDigests = parts
      .filter((part) => part.startsWith('v0='))
      .map((part) => part.slice(3).trim().toLowerCase())
      .filter((digest) => /^[0-9a-f]+$/.test(digest));

    if (!timestamp || !/^\d+$/.test(timestamp) || providedDigests.length === 0) {
      return false;
    }

    const requestMs = Number(timestamp) * 1000;
    if (!Number.isFinite(requestMs)) {
      return false;
    }
    const now = Date.now();
    if (requestMs < now - TIMESTAMP_TOLERANCE_MS) {
      return false;
    }
    // Reject far-future timestamps (clock skew / replay craft).
    if (requestMs > now + TIMESTAMP_TOLERANCE_MS) {
      return false;
    }

    const message = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedHex = createHmac('sha256', secret)
      .update(message, 'utf8')
      .digest('hex');
    const expected = Buffer.from(expectedHex, 'utf8');

    for (const digest of providedDigests) {
      if (digest.length !== expectedHex.length) {
        continue;
      }
      const candidate = Buffer.from(digest, 'utf8');
      if (
        candidate.length === expected.length &&
        timingSafeEqual(candidate, expected)
      ) {
        return true;
      }
    }

    return false;
  }

  private readSignatureHeader(request: Request): string {
    return (
      request.header('elevenlabs-signature') ??
      request.header('x-elevenlabs-signature') ??
      ''
    );
  }
}
