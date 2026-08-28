import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElevenLabsVoiceCatalogAdapter } from '../../providers/elevenlabs/elevenlabs-voice-catalog.adapter';
import { ElevenLabsVoiceCloneAdapter } from '../../providers/elevenlabs/elevenlabs-voice-clone.adapter';
import { VOICE_CATALOG_PORT } from '../../providers/voice-catalog.port';
import { VOICE_CLONE_PORT } from '../../providers/voice-clone.port';
import { ObjectStorageModule } from '../../infrastructure/object-storage/object-storage.module';
import { AgentConfig } from '../agents/entities/agent-config.entity';
import { AuthModule } from '../auth/auth.module';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VoiceAsset } from '../voices/entities/voice-asset.entity';
import { VoiceProviderMapping } from '../voices/entities/voice-provider-mapping.entity';
import { VoiceClone } from './entities/voice-clone.entity';
import { VoiceConsent } from './entities/voice-consent.entity';
import { VoiceSample } from './entities/voice-sample.entity';
import { VoiceClonesService } from './voice-clones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoiceClone,
      VoiceConsent,
      VoiceSample,
      VoiceAsset,
      VoiceProviderMapping,
      AgentConfig,
      Business,
    ]),
    AuthModule,
    OrganizationsModule,
    ObjectStorageModule,
  ],
  controllers: [],
  providers: [
    VoiceClonesService,
    ElevenLabsVoiceCloneAdapter,
    ElevenLabsVoiceCatalogAdapter,
    {
      provide: VOICE_CLONE_PORT,
      useExisting: ElevenLabsVoiceCloneAdapter,
    },
    {
      provide: VOICE_CATALOG_PORT,
      useExisting: ElevenLabsVoiceCatalogAdapter,
    },
  ],
  exports: [VoiceClonesService],
})
export class VoiceClonesModule {}
