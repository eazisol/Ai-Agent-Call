import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { ApplicationError } from '../../common/errors/application-error';
import type { VoiceAgentProviderPort } from '../../providers/voice-agent-provider.port';

@Injectable()
export class OpenaiRealtimeService implements VoiceAgentProviderPort {
  readonly providerName = 'openai_realtime';
  private readonly logger = new Logger(OpenaiRealtimeService.name);

  constructor(private readonly config: ConfigService) {}

  createRealtimeConnection(): WebSocket {
    const apiKey = this.config.get<string>('openai.apiKey');
    if (!apiKey) {
      throw new ApplicationError(
        'VOICE_PROVIDER_NOT_CONFIGURED',
        'The voice provider is not configured.',
        503,
      );
    }

    const model =
      this.config.get<string>('openai.realtimeModel') ?? 'gpt-realtime';
    const socket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        handshakeTimeout: 10_000,
      },
    );

    socket.on('open', () => {
      this.logger.log('Voice-agent session connected');
      socket.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: this.config.get<string>('openai.defaultVoice') ?? 'alloy',
            instructions: this.config.get<string>('openai.defaultInstructions'),
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            turn_detection: { type: 'server_vad' },
          },
        }),
      );
    });
    socket.on('error', (error) => {
      this.logger.error(`Voice-agent socket error: ${error.message}`);
    });
    socket.on('close', (code) => {
      this.logger.log(`Voice-agent session closed with code ${code}`);
    });

    return socket;
  }
}
