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
    const signedUrl = await this.fetchSignedConversationUrl(
      cfg,
      input.externalAgentId,
    );

    const response = new twiml.VoiceResponse();
    response.say({ voice: 'alice' }, input.greeting.slice(0, 500));
    const connect = response.connect();
    connect.stream({ url: signedUrl });
    return response.toString();
  }

  buildFailureResponse(input: InboundFailureResponseInput): string {
    const response = new twiml.VoiceResponse();
    response.say({ voice: 'alice' }, input.safeMessage.slice(0, 500));
    response.hangup();
    return response.toString();
  }

  private async fetchSignedConversationUrl(
    cfg: ElevenLabsConfig,
    externalAgentId: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const response = await fetch(
        `${cfg.baseUrl.replace(/\/$/, '')}/v1/convai/conversation/get_signed_url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': cfg.apiKey,
          },
          body: JSON.stringify({ agent_id: externalAgentId }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const snippet = (await response.text()).slice(0, 200);
        this.logger.warn(
          `ElevenLabs signed URL request failed (${response.status}): ${snippet}`,
        );
        throw new Error('PROVIDER_UNAVAILABLE');
      }

      const payload = (await response.json()) as {
        signed_url?: string;
        signedUrl?: string;
      };
      const signedUrl = payload.signed_url ?? payload.signedUrl;
      if (!signedUrl) {
        throw new Error('PROVIDER_UNAVAILABLE');
      }
      return signedUrl;
    } finally {
      clearTimeout(timer);
    }
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
