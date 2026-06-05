import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { OpenaiRealtimeService } from '../openai-realtime/openai-realtime.service';

@WebSocketGateway({
    path: '/voice/stream',
})
export class VoiceStreamGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(VoiceStreamGateway.name);

    constructor(private readonly openaiRealtimeService: OpenaiRealtimeService) { }

    handleConnection(client: WebSocket) {
        this.logger.log('Twilio voice stream connected');

        let streamSid: string | null = null;
        const openAiWs = this.openaiRealtimeService.createRealtimeConnection();

        openAiWs.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());

                if (response.type === 'response.audio.delta' && response.delta) {
                    if (streamSid && client.readyState === WebSocket.OPEN) {
                        client.send(
                            JSON.stringify({
                                event: 'media',
                                streamSid,
                                media: {
                                    payload: response.delta,
                                },
                            }),
                        );
                    }
                }

                if (response.type === 'error') {
                    this.logger.error(`OpenAI error: ${JSON.stringify(response)}`);
                }
            } catch (error) {
                this.logger.error(
                    'Failed to process OpenAI Realtime message',
                    error instanceof Error ? error.stack : String(error),
                );
            }
        });

        client.on('message', (message: Buffer) => {
            try {
                const payload = JSON.parse(message.toString());

                switch (payload.event) {
                    case 'connected':
                        this.logger.log('Twilio event: connected');
                        break;

                    case 'start':
                        streamSid = payload.start?.streamSid;
                        this.logger.log(
                            `Twilio stream started | CallSid: ${payload.start?.callSid} | StreamSid: ${streamSid}`,
                        );
                        break;

                    case 'media':
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            openAiWs.send(
                                JSON.stringify({
                                    type: 'input_audio_buffer.append',
                                    audio: payload.media.payload,
                                }),
                            );
                        }
                        break;

                    case 'stop':
                        this.logger.log('Twilio event: stop');

                        if (openAiWs.readyState === WebSocket.OPEN) {
                            openAiWs.close();
                        }

                        if (client.readyState === WebSocket.OPEN) {
                            client.close();
                        }
                        break;

                    default:
                        this.logger.warn(`Unknown Twilio event: ${payload.event}`);
                }
            } catch (error) {
                this.logger.error(
                    `Invalid Twilio WebSocket message: ${message.toString()}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        });

        client.on('close', (code, reason) => {
            this.logger.warn(
                `Twilio stream closed | Code: ${code} | Reason: ${reason.toString()}`,
            );

            if (openAiWs.readyState === WebSocket.OPEN) {
                openAiWs.close();
            }
        });

        client.on('error', (error) => {
            this.logger.error('Twilio stream socket error', error.stack);
        });
    }

    handleDisconnect() {
        this.logger.log('Twilio voice stream disconnected');
    }
}