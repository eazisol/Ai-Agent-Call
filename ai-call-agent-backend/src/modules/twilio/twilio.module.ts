import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwilioTelephonyAdapter } from '../../providers/twilio/twilio-telephony.adapter';
import { TELEPHONY_PROVIDER_PORT } from '../../providers/telephony-provider.port';
import { AuthModule } from '../auth/auth.module';
import { CallsModule } from '../calls/calls.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VoiceStreamModule } from '../voice-stream/voice-stream.module';
import { TelephonyProviderMapping } from './entities/telephony-provider-mapping.entity';
import { TelephonyController } from './telephony.controller';
import { TelephonyMappingsService } from './telephony-mappings.service';
import { TelephonyStatusService } from './telephony-status.service';
import { TwilioController } from './twilio.controller';
import { TwilioWebhookGuard } from './twilio-webhook.guard';
import { TwilioService } from './twilio.service';

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    CallsModule,
    VoiceStreamModule,
    TypeOrmModule.forFeature([TelephonyProviderMapping]),
  ],
  controllers: [TwilioController, TelephonyController],
  providers: [
    TelephonyMappingsService,
    TelephonyStatusService,
    TwilioTelephonyAdapter,
    TwilioService,
    TwilioWebhookGuard,
    { provide: TELEPHONY_PROVIDER_PORT, useExisting: TwilioTelephonyAdapter },
  ],
  exports: [
    TwilioService,
    TELEPHONY_PROVIDER_PORT,
    TelephonyMappingsService,
    TelephonyStatusService,
  ],
})
export class TwilioModule {}
