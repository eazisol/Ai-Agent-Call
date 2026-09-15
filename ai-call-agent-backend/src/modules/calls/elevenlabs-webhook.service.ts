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
    const normalized = this.normalizePayload(body);
    const conversationId = normalized.conversationId;
    const twilioCallSid = normalized.twilioCallSid;
    const eventType = normalized.eventType;

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
      payload: this.stringPayload({
        conversation_id: conversationId,
        call_sid: twilioCallSid,
        event_type: eventType,
        agent_id: normalized.agentId,
      }),
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
      eventType.includes('success') ||
      eventType === 'post_call_transcription' ||
      eventType === 'done'
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

  private normalizePayload(body: ElevenLabsConversationWebhookDto): {
    conversationId?: string;
    twilioCallSid?: string;
    agentId?: string;
    eventType: string;
  } {
    const data =
      body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : undefined;

    const conversationId = this.asString(
      body.conversation_id ??
        body.conversationId ??
        data?.conversation_id ??
        data?.conversationId,
    );

    const agentId = this.asString(
      body.agent_id ?? body.agentId ?? data?.agent_id ?? data?.agentId,
    );

    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined;
    const phoneCall =
      metadata?.phone_call && typeof metadata.phone_call === 'object'
        ? (metadata.phone_call as Record<string, unknown>)
        : undefined;
    const metaBody =
      metadata?.body && typeof metadata.body === 'object'
        ? (metadata.body as Record<string, unknown>)
        : undefined;

    const twilioCallSid = this.asString(
      body.call_sid ??
        body.callSid ??
        phoneCall?.call_sid ??
        phoneCall?.callSid ??
        metaBody?.CallSid ??
        metaBody?.call_sid,
    );

    const eventType = (
      body.type ??
      body.event_type ??
      body.eventType ??
      body.status ??
      this.asString(data?.status) ??
      'unknown'
    )
      .toLowerCase()
      .replace(/\s+/g, '_');

    return { conversationId, twilioCallSid, agentId, eventType };
  }

  private asString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private stringPayload(
    body: Record<string, string | undefined>,
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(body).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
}
