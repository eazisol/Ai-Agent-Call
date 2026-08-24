import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import {
  VOICE_AGENT_PROVIDER_PORT,
  type VoiceAgentProviderPort,
} from '../../providers/voice-agent-provider.port';
import { VoiceStreamTokenService } from './voice-stream-token.service';

interface TwilioStreamMessage {
  event?: 'connected' | 'start' | 'media' | 'stop';
  streamSid?: string;
  start?: {
    callSid?: string;
    streamSid?: string;
    customParameters?: Record<string, string>;
  };
  media?: { payload?: string };
}

@WebSocketGateway({ path: '/voice/stream' })
export class VoiceStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VoiceStreamGateway.name);

  constructor(
    @Inject(VOICE_AGENT_PROVIDER_PORT)
    private readonly voiceAgent: VoiceAgentProviderPort,
    private readonly tokens: VoiceStreamTokenService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: WebSocket): void {
    this.logger.log('Voice stream socket connected; awaiting verified start');
    let streamSid: string | undefined;
    let providerSocket: WebSocket | undefined;
    let verified = false;

    const maxDuration =
      (this.config.get<number>('voiceStream.maxDurationSeconds') ?? 7200) *
      1000;
    const maxMessageBytes =
      this.config.get<number>('voiceStream.maxMessageBytes') ?? 1_048_576;
    const durationTimer = setTimeout(
      () => client.close(1000, 'Session limit'),
      maxDuration,
    );

    const closeProvider = () => {
      if (providerSocket && providerSocket.readyState < WebSocket.CLOSING) {
        providerSocket.close();
      }
    };

    client.on('message', (message: Buffer) => {
      if (message.byteLength > maxMessageBytes) {
        client.close(1009, 'Message too large');
        return;
      }

      let payload: TwilioStreamMessage;
      try {
        payload = JSON.parse(message.toString('utf8')) as TwilioStreamMessage;
      } catch {
        client.close(1007, 'Invalid message');
        return;
      }

      if (payload.event === 'start') {
        const callSid = payload.start?.callSid;
        const token = payload.start?.customParameters?.token;
        if (!callSid || !token || !this.tokens.verify(token, callSid)) {
          this.logger.warn('Rejected unverified voice stream start');
          client.close(1008, 'Unauthorized stream');
          return;
        }

        verified = true;
        streamSid = payload.start?.streamSid;
        providerSocket = this.voiceAgent.createRealtimeConnection();
        providerSocket.on('message', (data) => {
          const message = Array.isArray(data)
            ? Buffer.concat(data).toString('utf8')
            : Buffer.isBuffer(data)
              ? data.toString('utf8')
              : Buffer.from(data).toString('utf8');
          this.forwardProviderAudio(client, streamSid, message);
        });
        providerSocket.on('error', () => client.close(1011, 'Provider error'));
        this.logger.log(`Verified voice stream for call ${callSid}`);
        return;
      }

      if (payload.event === 'media') {
        if (!verified || !providerSocket || !payload.media?.payload) {
          client.close(1008, 'Stream not initialized');
          return;
        }
        if (providerSocket.readyState === WebSocket.OPEN) {
          providerSocket.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: payload.media.payload,
            }),
          );
        }
        return;
      }

      if (payload.event === 'stop') {
        closeProvider();
        client.close(1000, 'Stream ended');
      }
    });

    client.on('close', () => {
      clearTimeout(durationTimer);
      closeProvider();
    });
    client.on('error', (error) => {
      this.logger.warn(`Voice stream socket error: ${error.message}`);
    });
  }

  handleDisconnect(): void {
    this.logger.log('Voice stream socket disconnected');
  }

  private forwardProviderAudio(
    client: WebSocket,
    streamSid: string | undefined,
    message: string,
  ): void {
    try {
      const response = JSON.parse(message) as {
        type?: string;
        delta?: string;
      };
      if (
        response.type === 'response.audio.delta' &&
        response.delta &&
        streamSid &&
        client.readyState === WebSocket.OPEN
      ) {
        client.send(
          JSON.stringify({
            event: 'media',
            streamSid,
            media: { payload: response.delta },
          }),
        );
      }
    } catch {
      this.logger.warn('Ignored malformed voice-provider event');
    }
  }
}
