import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import { TwilioWebhookGuard } from './twilio-webhook.guard';
import { TwilioService, type TwilioWebhookBody } from './twilio.service';

@Controller('webhooks/twilio')
@UseGuards(TwilioWebhookGuard)
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('incoming-call')
  @Header('Content-Type', 'text/xml')
  handleIncomingCall(@Body() body: TwilioWebhookBody): Promise<string> {
    return this.twilioService.handleIncomingCall(body);
  }

  @Post('call-ended')
  handleCallEnded(@Body() body: TwilioWebhookBody): Promise<{ success: true }> {
    return this.twilioService.handleCallEnded(body);
  }
}
