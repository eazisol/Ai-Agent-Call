import { Injectable, Logger } from '@nestjs/common';
import { CallLifecycleService } from './call-lifecycle.service';
import { ElevenLabsConversationWebhookDto } from './dto/elevenlabs-webhook.dto';

@Injectable()
export class ElevenLabsWebhookService {
  private readonly logger = new Logger(ElevenLabsWebhookService.name);

  constructor(private readonly lifecycle: CallLifecycleService) {}

  async handleConversationEvent(
    body: ElevenLabsConversationWebhookDto,
  ): Promise<{ success: true }> {
    const conversationId = body.conversation_id ?? body.conversationId;
    const twilioCallSid = body.call_sid ?? body.callSid;
    const eventType = (
      body.event_type ??
      body.eventType ??
      body.status ??
      'unknown'
    )
      .toLowerCase()
      .replace(/\s+/g, '_');

    if (!conversationId && !twilioCallSid) {
      this.logger.warn(
        'ElevenLabs webhook missing conversation and call identifiers',
      );
      return { success: true };
    }

    const call = twilioCallSid
      ? await this.lifecycle.findExistingByTwilioSid(twilioCallSid)
      : null;

    if (call && conversationId) {
      await this.lifecycle.linkProviderCallId(
        call.id,
        'elevenlabs',
        conversationId,
      );
    }

    const externalEventId = [
      conversationId ?? twilioCallSid ?? 'unknown',
      eventType,
    ].join(':');

    const isNew = await this.lifecycle.recordProviderEvent({
      provider: 'elevenlabs',
      externalEventId,
      eventType: `conversation:${eventType}`,
      payload: this.stringPayload(body),
      call: call ?? undefined,
    });

    if (!isNew || !call) {
      return { success: true };
    }

    if (eventType.includes('start') || eventType.includes('connected')) {
      await this.lifecycle.markInProgress('twilio', call.twilioCallSid);
      await this.lifecycle.appendCallEvent({
        callId: call.id,
        eventType: 'CALL_CONNECTED',
        source: 'elevenlabs',
        externalEventId,
      });
    } else if (
      eventType.includes('complete') ||
      eventType.includes('ended') ||
      eventType.includes('success')
    ) {
      await this.lifecycle.markCompleted('twilio', call.twilioCallSid);
    } else if (eventType.includes('fail') || eventType.includes('error')) {
      await this.lifecycle.markFailed(
        'twilio',
        call.twilioCallSid,
        eventType,
        'PROVIDER_UNAVAILABLE',
      );
    }

    this.logger.log(
      `Accepted ElevenLabs conversation event ${externalEventId}`,
    );
    return { success: true };
  }

  private stringPayload(
    body: ElevenLabsConversationWebhookDto,
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(body).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
}
