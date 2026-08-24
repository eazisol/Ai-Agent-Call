import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ApplicationError } from '../../common/errors/application-error';
import { TwilioService } from './twilio.service';

@Injectable()
export class TwilioWebhookGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly twilio: TwilioService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!(this.config.get<boolean>('twilio.validateSignatures') ?? true)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.header('x-twilio-signature') ?? '';
    const baseUrl = this.config.getOrThrow<string>('app.publicBaseUrl');
    const url = new URL(request.originalUrl, baseUrl).toString();
    const params = Object.fromEntries(
      Object.entries(request.body as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );

    if (!this.twilio.validateWebhook(url, params, signature)) {
      throw new ApplicationError(
        'INVALID_WEBHOOK_SIGNATURE',
        'Webhook signature validation failed.',
        403,
      );
    }

    return true;
  }
}
