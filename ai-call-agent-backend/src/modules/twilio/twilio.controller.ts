import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { TwilioWebhookGuard } from './twilio-webhook.guard';
import { TwilioService } from './twilio.service';

@Controller('webhooks/twilio')
@UseGuards(TwilioWebhookGuard)
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('incoming-call')
  @Header('Content-Type', 'text/xml')
  handleIncomingCall(@Body() body: TwilioWebhookDto): Promise<string> {
    return this.twilioService.handleIncomingCall(body);
  }

  @Post('call-ended')
  handleCallEnded(@Body() body: TwilioWebhookDto): Promise<{ success: true }> {
    return this.twilioService.handleCallEnded(body);
  }

  @Post('status-callback')
  handleStatusCallback(
    @Body() body: TwilioWebhookDto,
  ): Promise<{ success: true }> {
    return this.twilioService.handleStatusCallback(body);
  }
}
