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
    const signature = request.header('x-elevenlabs-signature') ?? '';
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    if (
      !signature ||
      signature.length !== expected.length ||
      !/^[0-9a-f]+$/i.test(signature)
    ) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    return true;
  }
}
