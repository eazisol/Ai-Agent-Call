import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { twiml } from 'twilio';
import {
  TELEPHONY_PROVIDER_PORT,
  type TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import {
  INBOUND_CALL_HANDOFF_PORT,
  type InboundCallHandoffPort,
  type ResolvedInboundCall,
} from '../../providers/inbound-call-handoff.port';
import { Call, CallStatus } from './entities/call.entity';
import { CallLifecycleService } from './call-lifecycle.service';
import { CallRoutingResolverService } from './call-routing-resolver.service';

export type TwilioInboundPayload = {
  CallSid?: string;
  From?: string;
  To?: string;
};

@Injectable()
export class InboundCallOrchestratorService {
  private readonly logger = new Logger(InboundCallOrchestratorService.name);

  constructor(
    private readonly routing: CallRoutingResolverService,
    private readonly lifecycle: CallLifecycleService,
    @Inject(INBOUND_CALL_HANDOFF_PORT)
    private readonly handoff: InboundCallHandoffPort,
    @Inject(TELEPHONY_PROVIDER_PORT)
    private readonly telephony: TelephonyProviderPort,
    private readonly config: ConfigService,
  ) {}

  async handleTwilioInbound(body: TwilioInboundPayload): Promise<string> {
    const externalCallId = body.CallSid?.trim();
    if (!externalCallId || externalCallId.length > 150) {
      throw new Error('INVALID_WEBHOOK_PAYLOAD');
    }

    const existing =
      await this.lifecycle.findExistingByTwilioSid(externalCallId);
    if (existing) {
      this.logger.log(`Duplicate inbound webhook for ${externalCallId}`);
      return this.buildResponseForExistingCall(existing, externalCallId, body);
    }

    await this.lifecycle.recordProviderEvent({
      provider: this.telephony.providerName,
      externalEventId: `${externalCallId}:call-started`,
      eventType: 'call-started',
      payload: this.stringPayload(body),
    });

    const routingResult = await this.routing.resolve(body.To);
    if (!routingResult.ok) {
      const call = await this.lifecycle.persistRoutingFailure({
        twilioCallSid: externalCallId,
        callerNumber: body.From,
        receiverNumber: body.To,
        failure: routingResult.failure,
      });
      await this.lifecycle.appendCallEvent({
        callId: call.id,
        eventType: 'CALL_RECEIVED',
        source: 'twilio',
        externalEventId: `${externalCallId}:received`,
      });
      await this.lifecycle.appendCallEvent({
        callId: call.id,
        eventType: 'ROUTING_FAILED',
        source: 'system',
        externalEventId: `${call.id}:routing-failed:${routingResult.failure.code}`,
        payload: {
          failureCode: routingResult.failure.code,
          failureStage: routingResult.failure.stage,
        },
      });
      return this.handoff.buildFailureResponse({
        externalCallId,
        failureCode: routingResult.failure.code,
        safeMessage: routingResult.failure.safeMessage,
      });
    }

    const call = await this.lifecycle.persistSuccessfulRouting({
      twilioCallSid: externalCallId,
      callerNumber: body.From,
      receiverNumber: body.To,
      context: routingResult.context,
    });

    await this.lifecycle.appendCallEvent({
      callId: call.id,
      eventType: 'CALL_RECEIVED',
      source: 'twilio',
      externalEventId: `${externalCallId}:received`,
    });
    await this.lifecycle.appendCallEvent({
      callId: call.id,
      eventType: 'ROUTING_RESOLVED',
      source: 'system',
      externalEventId: `${call.id}:routing-resolved`,
      payload: {
        businessId: routingResult.context.businessId,
        agentId: routingResult.context.agentId,
      },
    });

    const resolvedCall: ResolvedInboundCall = {
      callId: call.id,
      externalCallId,
      callerNumber: body.From,
      receiverNumber: body.To,
      businessId: routingResult.context.businessId,
      agentId: routingResult.context.agentId,
      externalAgentId: routingResult.context.externalAgentId,
      greeting: routingResult.context.greeting,
    };

    try {
      const twimlResponse = await this.buildHandoffResponse(resolvedCall);
      await this.lifecycle.appendCallEvent({
        callId: call.id,
        eventType: 'CALL_STARTED',
        source: 'system',
        externalEventId: `${call.id}:call-started`,
      });
      return twimlResponse;
    } catch (error) {
      this.logger.warn(
        `Handoff failed for call ${call.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      await this.lifecycle.markFailed(
        'twilio',
        externalCallId,
        'Handoff failed.',
        'HANDOFF_FAILED',
      );
      await this.lifecycle.appendCallEvent({
        callId: call.id,
        eventType: 'HANDOFF_FAILED',
        source: 'system',
        externalEventId: `${call.id}:handoff-failed`,
      });
      return this.handoff.buildFailureResponse({
        externalCallId,
        failureCode: 'HANDOFF_FAILED',
        safeMessage: 'We could not connect your call. Please try again later.',
      });
    }
  }

  private async buildHandoffResponse(
    resolved: ResolvedInboundCall,
  ): Promise<string> {
    if (this.handoff.isConfigured()) {
      return this.handoff.buildConnectResponse(resolved);
    }

    const devFallback = this.config.get<boolean>(
      'inboundCall.devStreamFallback',
    );
    if (devFallback) {
      this.logger.warn(
        `Using dev stream fallback for call ${resolved.externalCallId}`,
      );
      return this.telephony.buildIncomingCallResponse({
        externalCallId: resolved.externalCallId,
        callerNumber: resolved.callerNumber,
        receiverNumber: resolved.receiverNumber,
      });
    }

    throw new Error('Inbound handoff provider is not configured.');
  }

  private async buildResponseForExistingCall(
    call: Call,
    externalCallId: string,
    body: TwilioInboundPayload,
  ): Promise<string> {
    if (call.status === CallStatus.FAILED) {
      return this.handoff.buildFailureResponse({
        externalCallId,
        failureCode: 'DUPLICATE_WEBHOOK',
        safeMessage: 'This call has already ended.',
      });
    }

    if (
      call.status === CallStatus.COMPLETED ||
      call.status === CallStatus.IN_PROGRESS
    ) {
      const response = new twiml.VoiceResponse();
      response.say({ voice: 'alice' }, 'Please hold while we connect you.');
      return response.toString();
    }

    if (call.agent?.id && call.business?.id) {
      const mapping = await this.routing.resolve(body.To);
      if (mapping.ok) {
        return this.buildHandoffResponse({
          callId: call.id,
          externalCallId,
          callerNumber: body.From,
          receiverNumber: body.To,
          businessId: call.business.id,
          agentId: call.agent.id,
          externalAgentId: mapping.context.externalAgentId,
          greeting: mapping.context.greeting,
        });
      }
    }

    const response = new twiml.VoiceResponse();
    response.say({ voice: 'alice' }, 'Please hold.');
    return response.toString();
  }

  private stringPayload(body: TwilioInboundPayload): Record<string, string> {
    return Object.fromEntries(
      Object.entries(body).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }
}
