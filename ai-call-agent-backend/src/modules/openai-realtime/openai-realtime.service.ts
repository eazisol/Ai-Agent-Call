import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

@Injectable()
export class OpenaiRealtimeService {
    private readonly logger = new Logger(OpenaiRealtimeService.name);

    constructor(private readonly configService: ConfigService) { }

    createRealtimeConnection(): WebSocket {
        const apiKey = this.configService.get<string>('openai.apiKey');
        const model = this.configService.get<string>('openai.realtimeModel');

        const url = `wss://api.openai.com/v1/realtime?model=${model}`;

        const openAiWs = new WebSocket(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'OpenAI-Beta': 'realtime=v1',
            },
        });

        openAiWs.on('open', () => {
            this.logger.log('Connected to OpenAI Realtime API');

            openAiWs.send(
                JSON.stringify({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        voice: 'alloy',
                        instructions:
                            'You are a helpful AI customer support representative. Speak clearly and professionally.',
                        input_audio_format: 'g711_ulaw',
                        output_audio_format: 'g711_ulaw',
                        turn_detection: {
                            type: 'server_vad',
                        },
                    },
                }),
            );
        });

        openAiWs.on('message', (data) => {
            this.logger.debug(`OpenAI event received: ${data.toString()}`);
        });

        openAiWs.on('error', (error) => {
            this.logger.error('OpenAI Realtime WebSocket error', error.stack);
        });

        openAiWs.on('close', (code, reason) => {
            this.logger.warn(
                `OpenAI Realtime closed | Code: ${code} | Reason: ${reason.toString()}`,
            );
        });

        return openAiWs;
    }
}