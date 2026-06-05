import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { twiml } from 'twilio';
import { CallsService } from '../calls/calls.service';

@Injectable()
export class TwilioService {
    private readonly logger = new Logger(TwilioService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly callsService: CallsService,
    ) { }

    async handleIncomingCall(body: any): Promise<string> {
        this.logger.log(`Incoming call received: ${JSON.stringify(body)}`);

        const twilioCallSid = body.CallSid;
        const callerNumber = body.From;
        const receiverNumber = body.To;

        if (twilioCallSid) {
            await this.callsService.createFromTwilio({
                twilioCallSid,
                callerNumber,
                receiverNumber,
            });
        }

        const appBaseUrl = this.configService.get<string>('app.baseUrl');
        const wsUrl = appBaseUrl
            ?.replace('https://', 'wss://')
            .replace('http://', 'ws://');

        const response = new twiml.VoiceResponse();

        response.say(
            { voice: 'alice' },
            'Hello, you are now connected to the AI assistant.',
        );

        const connect = response.connect();
        connect.stream({
            url: `${wsUrl}/voice/stream`,
        });

        return response.toString();
    }

    async handleCallEnded(body: any) {
        this.logger.log(`Call ended webhook received: ${JSON.stringify(body)}`);

        if (body.CallSid) {
            await this.callsService.markCompleted(
                body.CallSid,
                body.CallDuration ? Number(body.CallDuration) : undefined,
            );
        }

        return {
            success: true,
            message: 'Call ended webhook received',
        };
    }
}