import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ElevenLabsConversationWebhookDto } from './dto/elevenlabs-webhook.dto';
import { ElevenLabsWebhookGuard } from './elevenlabs-webhook.guard';
import { ElevenLabsWebhookService } from './elevenlabs-webhook.service';

@Controller('webhooks/elevenlabs')
@UseGuards(ElevenLabsWebhookGuard)
export class ElevenLabsWebhookController {
  constructor(private readonly webhooks: ElevenLabsWebhookService) {}

  @Post('conversation-events')
  handleConversationEvents(
    @Body() body: ElevenLabsConversationWebhookDto,
  ): Promise<{ success: true }> {
    return this.webhooks.handleConversationEvent(body);
  }
}
