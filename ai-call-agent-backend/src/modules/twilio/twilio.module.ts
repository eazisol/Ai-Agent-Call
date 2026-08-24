import { Module } from '@nestjs/common';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';
import { CallsModule } from '../calls/calls.module';
import { VoiceStreamModule } from '../voice-stream/voice-stream.module';
import { TELEPHONY_PROVIDER_PORT } from '../../providers/telephony-provider.port';
import { TwilioWebhookGuard } from './twilio-webhook.guard';

@Module({
  imports: [CallsModule, VoiceStreamModule],
  controllers: [TwilioController],
  providers: [
    TwilioService,
    TwilioWebhookGuard,
    { provide: TELEPHONY_PROVIDER_PORT, useExisting: TwilioService },
  ],
  exports: [TwilioService, TELEPHONY_PROVIDER_PORT],
})
export class TwilioModule {}
