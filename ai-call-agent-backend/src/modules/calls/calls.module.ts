import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElevenLabsInboundHandoffAdapter } from '../../providers/elevenlabs/elevenlabs-inbound-handoff.adapter';
import { INBOUND_CALL_HANDOFF_PORT } from '../../providers/inbound-call-handoff.port';
import { AgentConfig } from '../agents/entities/agent-config.entity';
import { AgentPrompt } from '../agents/entities/agent-prompt.entity';
import { AgentProviderMapping } from '../agents/entities/agent-provider-mapping.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AuthModule } from '../auth/auth.module';
import { AgentKnowledgeSource } from '../knowledge/entities/agent-knowledge-source.entity';
import { KnowledgeProviderMapping } from '../knowledge/entities/knowledge-provider-mapping.entity';
import { KnowledgeSource } from '../knowledge/entities/knowledge-source.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PhoneNumberAssignment } from '../phone-numbers/entities/phone-number-assignment.entity';
import { PhoneNumber } from '../phone-numbers/entities/phone-number.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { VoiceClone } from '../voice-clones/entities/voice-clone.entity';
import { VoiceAsset } from '../voices/entities/voice-asset.entity';
import { VoiceProviderMapping } from '../voices/entities/voice-provider-mapping.entity';
import { CallLifecycleService } from './call-lifecycle.service';
import { CallRoutingResolverService } from './call-routing-resolver.service';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { ElevenLabsWebhookController } from './elevenlabs-webhook.controller';
import { ElevenLabsWebhookGuard } from './elevenlabs-webhook.guard';
import { ElevenLabsWebhookService } from './elevenlabs-webhook.service';
import { CallEvent } from './entities/call-event.entity';
import { CallMessage } from './entities/call-message.entity';
import { CallProviderMapping } from './entities/call-provider-mapping.entity';
import { CallRecording } from './entities/call-recording.entity';
import { Call } from './entities/call.entity';
import { EmailLog } from './entities/email-log.entity';
import { ProviderEvent } from './entities/provider-event.entity';
import { InboundCallOrchestratorService } from './inbound-call-orchestrator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Call,
      CallEvent,
      CallMessage,
      CallRecording,
      EmailLog,
      CallProviderMapping,
      ProviderEvent,
      PhoneNumber,
      PhoneNumberAssignment,
      Agent,
      AgentConfig,
      AgentPrompt,
      AgentProviderMapping,
      AgentKnowledgeSource,
      KnowledgeSource,
      KnowledgeProviderMapping,
      VoiceAsset,
      VoiceProviderMapping,
      VoiceClone,
    ]),
    AuthModule,
    OrganizationsModule,
    forwardRef(() => TwilioModule),
  ],
  controllers: [CallsController, ElevenLabsWebhookController],
  providers: [
    CallLifecycleService,
    CallRoutingResolverService,
    InboundCallOrchestratorService,
    CallsService,
    ElevenLabsWebhookService,
    ElevenLabsWebhookGuard,
    ElevenLabsInboundHandoffAdapter,
    {
      provide: INBOUND_CALL_HANDOFF_PORT,
      useExisting: ElevenLabsInboundHandoffAdapter,
    },
  ],
  exports: [
    CallsService,
    CallLifecycleService,
    InboundCallOrchestratorService,
    TypeOrmModule,
  ],
})
export class CallsModule {}
