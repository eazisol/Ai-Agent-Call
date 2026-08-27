import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
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
  providers: [AgentsService],
  exports: [AgentsService, TypeOrmModule],
})
export class AgentsModule {}
