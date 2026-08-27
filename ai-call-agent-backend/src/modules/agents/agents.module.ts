import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElevenLabsVoiceAgentSyncAdapter } from '../../providers/elevenlabs/elevenlabs-voice-agent-sync.adapter';
import { VOICE_AGENT_SYNC_PORT } from '../../providers/voice-agent-sync.port';
import { AuthModule } from '../auth/auth.module';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AgentProviderSyncService } from './agent-provider-sync.service';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentConfig } from './entities/agent-config.entity';
import { AgentPrompt } from './entities/agent-prompt.entity';
import { AgentProviderMapping } from './entities/agent-provider-mapping.entity';
import { Agent } from './entities/agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      AgentConfig,
      AgentPrompt,
      AgentProviderMapping,
      Business,
    ]),
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    AgentProviderSyncService,
    ElevenLabsVoiceAgentSyncAdapter,
    {
      provide: VOICE_AGENT_SYNC_PORT,
      useExisting: ElevenLabsVoiceAgentSyncAdapter,
    },
  ],
  exports: [AgentsService, AgentProviderSyncService, TypeOrmModule],
})
export class AgentsModule {}
