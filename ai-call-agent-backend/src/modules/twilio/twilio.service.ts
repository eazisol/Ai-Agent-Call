import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import {
  TELEPHONY_PROVIDER_PORT,
  type TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import { CallLifecycleService } from '../calls/call-lifecycle.service';
import { InboundCallOrchestratorService } from '../calls/inbound-call-orchestrator.service';
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
    private readonly lifecycle: CallLifecycleService,
    private readonly inboundOrchestrator: InboundCallOrchestratorService,
  ) {}

  async handleIncomingCall(body: TwilioWebhookBody): Promise<string> {
    this.requiredCallSid(body);
    try {
      const twiml = await this.inboundOrchestrator.handleTwilioInbound(body);
      this.logger.log(
        `Accepted incoming Twilio call ${body.CallSid} with orchestrated routing`,
      );
      return twiml;
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_WEBHOOK_PAYLOAD') {
        throw new ApplicationError(
          'INVALID_WEBHOOK_PAYLOAD',
          'CallSid is required.',
          400,
        );
      }
      throw error;
    }
  }

  async handleCallEnded(body: TwilioWebhookBody): Promise<{ success: true }> {
    const externalCallId = this.requiredCallSid(body);
    const externalEventId = [
      externalCallId,
      body.CallStatus ?? 'completed',
      body.Timestamp ?? body.CallDuration ?? 'unknown',
    ].join(':');

    const call = await this.lifecycle.findExistingByTwilioSid(externalCallId);
    const isNew = await this.lifecycle.recordProviderEvent({
      provider: this.telephony.providerName,
      externalEventId,
      eventType: 'call-ended',
      payload: this.stringPayload(body),
      call: call ?? undefined,
    });
    if (isNew) {
      await this.lifecycle.markCompleted(
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

    const call = await this.lifecycle.findExistingByTwilioSid(externalCallId);
    const isNew = await this.lifecycle.recordProviderEvent({
      provider: this.telephony.providerName,
      externalEventId,
      eventType: `call-status:${status}`,
      payload: this.stringPayload(body),
      call: call ?? undefined,
    });

    if (isNew) {
      if (status === 'in-progress' || status === 'answered') {
        await this.lifecycle.markInProgress(
          this.telephony.providerName,
          externalCallId,
        );
        if (call) {
          await this.lifecycle.appendCallEvent({
            callId: call.id,
            eventType: 'CALL_CONNECTED',
            source: 'twilio',
            externalEventId: `${externalCallId}:connected:${status}`,
          });
        }
      } else if (status === 'completed') {
        await this.lifecycle.markCompleted(
          this.telephony.providerName,
          externalCallId,
          this.duration(body.CallDuration),
        );
      } else if (TERMINAL_FAILURE_STATUSES.has(status)) {
        await this.lifecycle.markFailed(
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

  buildIncomingCallResponse(
    context: Parameters<TelephonyProviderPort['buildIncomingCallResponse']>[0],
  ): string {
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
