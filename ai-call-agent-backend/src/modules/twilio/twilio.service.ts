import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { twiml, validateRequest } from 'twilio';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  IncomingCallContext,
  TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import { CallsService } from '../calls/calls.service';
import { VoiceStreamTokenService } from '../voice-stream/voice-stream-token.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';

/** Validated Twilio form body; extra string fields may still be present at runtime. */
export type TwilioWebhookBody = TwilioWebhookDto;

@Injectable()
export class TwilioService implements TelephonyProviderPort {
  readonly providerName = 'twilio';
  private readonly logger = new Logger(TwilioService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly calls: CallsService,
    private readonly streamTokens: VoiceStreamTokenService,
  ) {}

  validateWebhook(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean {
    const authToken = this.config.get<string>('twilio.authToken');
    return Boolean(
      authToken &&
      signature &&
      validateRequest(authToken, signature, url, params),
    );
  }

  buildIncomingCallResponse(context: IncomingCallContext): string {
    const baseUrl = this.config.getOrThrow<string>('app.publicBaseUrl');
    const streamUrl = new URL('/voice/stream', baseUrl);
    streamUrl.protocol = streamUrl.protocol === 'https:' ? 'wss:' : 'ws:';

    const response = new twiml.VoiceResponse();
    response.say(
      { voice: 'alice' },
      'Hello, you are now connected to the EaziAiCall assistant.',
    );
    const stream = response.connect().stream({ url: streamUrl.toString() });
    stream.parameter({
      name: 'token',
      value: this.streamTokens.create(context.externalCallId),
    });
    return response.toString();
  }

  async handleIncomingCall(body: TwilioWebhookBody): Promise<string> {
    const externalCallId = this.requiredCallSid(body);
    await this.calls.createFromProvider({
      provider: this.providerName,
      externalCallId,
      callerNumber: body.From,
      receiverNumber: body.To,
    });
    this.logger.log(`Accepted incoming Twilio call ${externalCallId}`);
    return this.buildIncomingCallResponse({
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
    const payload = Object.fromEntries(
      Object.entries(body as unknown as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );

    const isNew = await this.calls.recordProviderEvent({
      provider: this.providerName,
      externalEventId,
      eventType: 'call-ended',
      payload,
    });
    if (isNew) {
      await this.calls.markCompleted(
        this.providerName,
        externalCallId,
        this.duration(body.CallDuration),
      );
    }
    this.logger.log(`Accepted Twilio call-ended event ${externalEventId}`);
    return { success: true };
  }

  private requiredCallSid(body: TwilioWebhookBody): string {
    if (!body.CallSid || body.CallSid.length > 150) {
      throw new ApplicationError(
        'INVALID_WEBHOOK_PAYLOAD',
        'CallSid is required.',
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
}
