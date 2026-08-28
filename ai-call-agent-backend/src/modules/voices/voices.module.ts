import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElevenLabsVoiceCatalogAdapter } from '../../providers/elevenlabs/elevenlabs-voice-catalog.adapter';
import { VOICE_CATALOG_PORT } from '../../providers/voice-catalog.port';
import { AgentConfig } from '../agents/entities/agent-config.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AuthModule } from '../auth/auth.module';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VoiceClonesModule } from '../voice-clones/voice-clones.module';
import { VoiceClonesController } from '../voice-clones/voice-clones.controller';
import { VoiceAsset } from './entities/voice-asset.entity';
import { VoiceProviderMapping } from './entities/voice-provider-mapping.entity';
import { AgentVoiceController, VoicesController } from './voices.controller';
import { VoiceCatalogSyncService, VoicesService } from './voices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoiceAsset,
      VoiceProviderMapping,
      Agent,
      AgentConfig,
      Business,
    ]),
    AuthModule,
    OrganizationsModule,
    VoiceClonesModule,
  ],
  controllers: [VoiceClonesController, VoicesController, AgentVoiceController],
  providers: [
    VoicesService,
    VoiceCatalogSyncService,
    ElevenLabsVoiceCatalogAdapter,
    {
      provide: VOICE_CATALOG_PORT,
      useExisting: ElevenLabsVoiceCatalogAdapter,
    },
  ],
  exports: [VoicesService, VoiceCatalogSyncService, TypeOrmModule],
})
export class VoicesModule {}
