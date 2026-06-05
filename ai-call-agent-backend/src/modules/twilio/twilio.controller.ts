import { Body, Controller, Header, Post } from '@nestjs/common';
import { TwilioService } from './twilio.service';

@Controller('webhooks/twilio')
export class TwilioController {
    constructor(private readonly twilioService: TwilioService) { }

    @Post('incoming-call')
    @Header('Content-Type', 'text/xml')
    async handleIncomingCall(@Body() body: any): Promise<string> {
        return this.twilioService.handleIncomingCall(body);
    }

    @Post('call-ended')
    async handleCallEnded(@Body() body: any) {
        return this.twilioService.handleCallEnded(body);
    }
}
