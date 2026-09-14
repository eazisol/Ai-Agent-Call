import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { twiml } from 'twilio';
import type {
  InboundCallHandoffPort,
  InboundFailureResponseInput,
  ResolvedInboundCall,
} from '../inbound-call-handoff.port';

type ElevenLabsConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
};

@Injectable()
export class ElevenLabsInboundHandoffAdapter implements InboundCallHandoffPort {
  readonly providerName = 'elevenlabs';
  private readonly logger = new Logger(ElevenLabsInboundHandoffAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.readConfig().apiKey);
  }

  async buildConnectResponse(input: ResolvedInboundCall): Promise<string> {
    const cfg = this.readConfig(true);
    const fromNumber = input.callerNumber?.trim();
    const toNumber = input.receiverNumber?.trim();
    if (!fromNumber || !toNumber) {
      this.logger.warn(
        `ElevenLabs register-call missing From/To for ${input.externalCallId}`,
      );
      throw new Error('PROVIDER_UNAVAILABLE');
    }
    if (!input.externalAgentId?.trim()) {
      this.logger.warn(
        `ElevenLabs register-call missing external agent for ${input.externalCallId}`,
      );
      throw new Error('PROVIDER_UNAVAILABLE');
    }

    return this.registerTwilioCall(cfg, {
      agentId: input.externalAgentId.trim(),
      fromNumber,
      toNumber,
      externalCallId: input.externalCallId,
    });
  }

  buildFailureResponse(input: InboundFailureResponseInput): string {
    const response = new twiml.VoiceResponse();
    response.say({ voice: 'alice' }, input.safeMessage.slice(0, 500));
    response.hangup();
    return response.toString();
  }

  /**
   * Official Twilio handoff: POST /v1/convai/twilio/register-call
   * Returns opaque provider TwiML for Twilio (no signed-url / Connect Stream path).
   */
  private async registerTwilioCall(
    cfg: ElevenLabsConfig,
    input: {
      agentId: string;
      fromNumber: string;
      toNumber: string;
      externalCallId: string;
    },
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const response = await fetch(
        `${cfg.baseUrl.replace(/\/$/, '')}/v1/convai/twilio/register-call`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/xml, text/xml, application/json, */*',
            'Content-Type': 'application/json',
            'xi-api-key': cfg.apiKey,
          },
          body: JSON.stringify({
            agent_id: input.agentId,
            from_number: input.fromNumber,
            to_number: input.toNumber,
            direction: 'inbound',
          }),
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      if (!response.ok) {
        const snippet = bodyText.slice(0, 200);
        this.logger.warn(
          `ElevenLabs register-call failed (${response.status}) for ${input.externalCallId}: ${snippet}`,
        );
        throw new Error('PROVIDER_UNAVAILABLE');
      }

      const twimlXml = this.extractTwiml(bodyText);
      if (!twimlXml) {
        this.logger.warn(
          `ElevenLabs register-call returned empty TwiML for ${input.externalCallId}`,
        );
        throw new Error('PROVIDER_UNAVAILABLE');
      }
      return twimlXml;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('abort'))
      ) {
        this.logger.warn(
          `ElevenLabs register-call timed out for ${input.externalCallId}`,
        );
        throw new Error('PROVIDER_UNAVAILABLE');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Pass through XML TwiML; unwrap JSON string envelopes if present. */
  private extractTwiml(bodyText: string): string | null {
    const trimmed = bodyText.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('<')) {
      return trimmed;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === 'string' && parsed.trim().startsWith('<')) {
        return parsed.trim();
      }
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof (parsed as { twiml?: unknown }).twiml === 'string'
      ) {
        const nested = (parsed as { twiml: string }).twiml.trim();
        return nested.startsWith('<') ? nested : null;
      }
    } catch {
      // not JSON
    }
    return null;
  }

  private readConfig(required = false): ElevenLabsConfig {
    const apiKey = (this.config.get<string>('elevenlabs.apiKey') ?? '').trim();
    if (required && !apiKey) {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }
    return {
      apiKey,
      baseUrl:
        this.config.get<string>('elevenlabs.baseUrl') ??
        'https://api.elevenlabs.io',
      timeoutMs: this.config.get<number>('elevenlabs.timeoutMs') ?? 20_000,
    };
  }
}
