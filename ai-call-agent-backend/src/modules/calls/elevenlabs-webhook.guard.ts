import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class ElevenLabsWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = (this.config.get<string>('inboundCall.elevenLabsWebhookSecret') ?? '').trim();
    if (!secret) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.header('x-elevenlabs-signature') ?? '';
    const rawBody = JSON.stringify(request.body ?? {});
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    if (!signature || signature.length !== expected.length) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new UnauthorizedException('Invalid ElevenLabs webhook signature.');
    }

    return true;
  }
}
