import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectStorageModule } from '../../infrastructure/object-storage/object-storage.module';
import { ElevenLabsKnowledgeSyncAdapter } from '../../providers/elevenlabs/elevenlabs-knowledge-sync.adapter';
import { KNOWLEDGE_SYNC_PORT } from '../../providers/knowledge-sync.port';
import { Agent } from '../agents/entities/agent.entity';
import { AuthModule } from '../auth/auth.module';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AgentKnowledgeController } from './agent-knowledge.controller';
import { AgentKnowledgeSource } from './entities/agent-knowledge-source.entity';
import { KnowledgeProviderMapping } from './entities/knowledge-provider-mapping.entity';
import { KnowledgeSource } from './entities/knowledge-source.entity';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeSyncService } from './knowledge-sync.service';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeSource,
      AgentKnowledgeSource,
      KnowledgeProviderMapping,
      Agent,
      Business,
    ]),
    AuthModule,
    OrganizationsModule,
    ObjectStorageModule,
  ],
  controllers: [KnowledgeController, AgentKnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeSyncService,
    ElevenLabsKnowledgeSyncAdapter,
    {
      provide: KNOWLEDGE_SYNC_PORT,
      useExisting: ElevenLabsKnowledgeSyncAdapter,
    },
  ],
  exports: [KnowledgeService, KnowledgeSyncService, TypeOrmModule],
})
export class KnowledgeModule {}
