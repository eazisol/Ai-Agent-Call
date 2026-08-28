import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import {
  TELEPHONY_PROVIDER_PORT,
  type IncomingCallContext,
  type TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import { CallsService } from '../calls/calls.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';

/** Validated Twilio form body; extra string fields may still be present at runtime. */
export type TwilioWebhookBody = TwilioWebhookDto;

const TERMINAL_FAILURE_STATUSES = new Set([
  'failed',
  'busy',
  'no-answer',
  'canceled',
]);

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);

  constructor(
    @Inject(TELEPHONY_PROVIDER_PORT)
    private readonly telephony: TelephonyProviderPort,
    private readonly calls: CallsService,
  ) {}

  async handleIncomingCall(body: TwilioWebhookBody): Promise<string> {
    const externalCallId = this.requiredCallSid(body);
    await this.calls.createFromProvider({
      provider: this.telephony.providerName,
      externalCallId,
      callerNumber: body.From,
      receiverNumber: body.To,
    });
    await this.calls.recordProviderEvent({
      provider: this.telephony.providerName,
      externalEventId: `${externalCallId}:call-started`,
      eventType: 'call-started',
      payload: this.stringPayload(body),
    });
    this.logger.log(`Accepted incoming Twilio call ${externalCallId}`);
    return this.telephony.buildIncomingCallResponse({
      externalCallId,
      callerNumber: body.From,
      receiverNumber: body.To,
    });
  }

  async handleCallEnded(body: TwilioWebhookBody): Promise<{ success: true }> {
    const externalCallId = this.requiredCallSid(body);
    const externalEventId = [
      externalCallId,
      body.CallStatus ?? 'completed',
      body.Timestamp ?? body.CallDuration ?? 'unknown',
    ].join(':');

    const isNew = await this.calls.recordProviderEvent({
      provider: this.telephony.providerName,
      externalEventId,
      eventType: 'call-ended',
      payload: this.stringPayload(body),
    });
    if (isNew) {
      await this.calls.markCompleted(
        this.telephony.providerName,
        externalCallId,
        this.duration(body.CallDuration),
      );
    }
    this.logger.log(`Accepted Twilio call-ended event ${externalEventId}`);
    return { success: true };
  }

  async handleStatusCallback(
    body: TwilioWebhookBody,
  ): Promise<{ success: true }> {
    const externalCallId = this.requiredCallSid(body);
    const status = (body.CallStatus ?? 'unknown').toLowerCase();
    const externalEventId = [
      externalCallId,
      status,
      body.SequenceNumber ?? body.Timestamp ?? 'unknown',
    ].join(':');

    const isNew = await this.calls.recordProviderEvent({
      provider: this.telephony.providerName,
      externalEventId,
      eventType: `call-status:${status}`,
      payload: this.stringPayload(body),
    });

    if (isNew) {
      if (status === 'completed') {
        await this.calls.markCompleted(
          this.telephony.providerName,
          externalCallId,
          this.duration(body.CallDuration),
        );
      } else if (TERMINAL_FAILURE_STATUSES.has(status)) {
        await this.calls.markFailed(
          this.telephony.providerName,
          externalCallId,
          status,
        );
      }
    }

    this.logger.log(`Accepted Twilio status callback ${externalEventId}`);
    return { success: true };
  }

  validateWebhook(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean {
    return this.telephony.validateWebhook(url, params, signature);
  }

  buildIncomingCallResponse(context: IncomingCallContext): string {
    return this.telephony.buildIncomingCallResponse(context);
  }

  private requiredCallSid(body: TwilioWebhookBody): string {
    if (!body.CallSid || body.CallSid.length > 150) {
      throw new ApplicationError(
        'INVALID_WEBHOOK_PAYLOAD',
        'CallSid is required.',
        400,
      );
    }
    return body.CallSid;
  }

  private duration(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private stringPayload(body: TwilioWebhookBody): Record<string, string> {
    return Object.fromEntries(
      Object.entries(body as unknown as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
}
