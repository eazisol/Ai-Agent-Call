import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentConfig } from '../agents/entities/agent-config.entity';
import { AgentPrompt } from '../agents/entities/agent-prompt.entity';
import {
  AgentProviderMapping,
  type AgentProviderSyncStatus,
} from '../agents/entities/agent-provider-mapping.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentKnowledgeSource } from '../knowledge/entities/agent-knowledge-source.entity';
import {
  KnowledgeProviderMapping,
  type KnowledgeProviderSyncStatus,
} from '../knowledge/entities/knowledge-provider-mapping.entity';
import { KnowledgeSource } from '../knowledge/entities/knowledge-source.entity';
import {
  PhoneNumberAssignment,
} from '../phone-numbers/entities/phone-number-assignment.entity';
import { PhoneNumber } from '../phone-numbers/entities/phone-number.entity';
import { VoiceClone } from '../voice-clones/entities/voice-clone.entity';
import { VoiceAsset } from '../voices/entities/voice-asset.entity';
import { VoiceProviderMapping } from '../voices/entities/voice-provider-mapping.entity';
import {
  FAILURE_MESSAGES,
  normalizePhoneE164,
  type ResolvedRoutingContext,
  type RoutingFailure,
  type RoutingResult,
} from './call-routing.types';

const ELEVENLABS_PROVIDER = 'elevenlabs';
const SYNCED: AgentProviderSyncStatus = 'synced';
const KNOWLEDGE_SYNCED: KnowledgeProviderSyncStatus = 'synced';

@Injectable()
export class CallRoutingResolverService {
  private readonly logger = new Logger(CallRoutingResolverService.name);

  constructor(
    @InjectRepository(PhoneNumber)
    private readonly phoneRepository: Repository<PhoneNumber>,
    @InjectRepository(PhoneNumberAssignment)
    private readonly assignmentRepository: Repository<PhoneNumberAssignment>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(AgentConfig)
    private readonly agentConfigRepository: Repository<AgentConfig>,
    @InjectRepository(AgentPrompt)
    private readonly agentPromptRepository: Repository<AgentPrompt>,
    @InjectRepository(AgentProviderMapping)
    private readonly agentMappingRepository: Repository<AgentProviderMapping>,
    @InjectRepository(AgentKnowledgeSource)
    private readonly agentKnowledgeRepository: Repository<AgentKnowledgeSource>,
    @InjectRepository(KnowledgeSource)
    private readonly knowledgeRepository: Repository<KnowledgeSource>,
    @InjectRepository(KnowledgeProviderMapping)
    private readonly knowledgeMappingRepository: Repository<KnowledgeProviderMapping>,
    @InjectRepository(VoiceAsset)
    private readonly voiceAssetRepository: Repository<VoiceAsset>,
    @InjectRepository(VoiceProviderMapping)
    private readonly voiceMappingRepository: Repository<VoiceProviderMapping>,
    @InjectRepository(VoiceClone)
    private readonly voiceCloneRepository: Repository<VoiceClone>,
  ) {}

  async resolve(receiverNumber: string | undefined): Promise<RoutingResult> {
    const e164 = normalizePhoneE164(receiverNumber);
    if (!e164) {
      return this.fail('UNKNOWN_NUMBER', 'normalize_e164');
    }

    const phone = await this.phoneRepository.findOne({
      where: { phoneNumberE164: e164, status: 'active' },
    });
    if (!phone) {
      return this.fail('UNKNOWN_NUMBER', 'phone_lookup');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { phoneNumberId: phone.id, status: 'active' },
    });
    if (!assignment) {
      return this.fail('UNASSIGNED_NUMBER', 'assignment_lookup', {
        businessId: phone.businessId,
        phoneNumberId: phone.id,
      });
    }

    const agent = await this.agentRepository.findOne({
      where: { id: assignment.agentId },
    });
    if (!agent || agent.status !== 'active') {
      return this.fail('INACTIVE_AGENT', 'agent_status', {
        businessId: phone.businessId,
        phoneNumberId: phone.id,
        agentId: assignment.agentId,
      });
    }

    if (agent.businessId !== phone.businessId) {
      this.logger.error(
        `Cross-business mapping detected: phone ${phone.id} business ${phone.businessId} agent ${agent.id} business ${agent.businessId}`,
      );
      return this.fail('CROSS_BUSINESS_MAPPING', 'business_integrity', {
        businessId: phone.businessId,
        phoneNumberId: phone.id,
        agentId: agent.id,
      });
    }

    const knowledgeFailure = await this.validateAssignedKnowledge(agent.id);
    if (knowledgeFailure) {
      return {
        ok: false,
        failure: {
          ...knowledgeFailure,
          businessId: phone.businessId,
          phoneNumberId: phone.id,
          agentId: agent.id,
        },
      };
    }

    const voiceFailure = await this.validateSelectedVoice(
      agent.id,
      phone.businessId,
    );
    if (voiceFailure) {
      return {
        ok: false,
        failure: {
          ...voiceFailure,
          businessId: phone.businessId,
          phoneNumberId: phone.id,
          agentId: agent.id,
        },
      };
    }

    const mapping = await this.agentMappingRepository.findOne({
      where: {
        agentId: agent.id,
        provider: ELEVENLABS_PROVIDER,
        syncStatus: SYNCED,
      },
    });
    if (!mapping?.externalAgentId) {
      return this.fail('UNSYNCED_AGENT', 'provider_mapping', {
        businessId: phone.businessId,
        phoneNumberId: phone.id,
        agentId: agent.id,
      });
    }

    const prompts = await this.agentPromptRepository.findOne({
      where: { agentId: agent.id },
    });
    const greeting =
      prompts?.greeting?.trim() ||
      `Hello, you have reached ${agent.name}. How can I help you today?`;

    const context: ResolvedRoutingContext = {
      phoneNumberId: phone.id,
      phoneNumberE164: phone.phoneNumberE164,
      businessId: phone.businessId,
      agentId: agent.id,
      agentName: agent.name,
      externalAgentId: mapping.externalAgentId,
      greeting,
    };

    return { ok: true, context };
  }

  private async validateAssignedKnowledge(
    agentId: string,
  ): Promise<Omit<RoutingFailure, 'businessId' | 'phoneNumberId' | 'agentId'> | null> {
    const assignments = await this.agentKnowledgeRepository.find({
      where: { agentId },
    });
    if (assignments.length === 0) {
      return null;
    }

    for (const assignment of assignments) {
      const source = await this.knowledgeRepository.findOne({
        where: { id: assignment.knowledgeSourceId },
      });
      if (!source || source.status !== 'active') {
        return this.buildFailure('KNOWLEDGE_NOT_READY', 'knowledge_source');
      }

      const providerMapping = await this.knowledgeMappingRepository.findOne({
        where: {
          knowledgeSourceId: source.id,
          provider: ELEVENLABS_PROVIDER,
        },
      });
      if (!providerMapping || providerMapping.syncStatus !== KNOWLEDGE_SYNCED) {
        return this.buildFailure('KNOWLEDGE_NOT_READY', 'knowledge_sync');
      }
    }

    return null;
  }

  private async validateSelectedVoice(
    agentId: string,
    businessId: string,
  ): Promise<Omit<RoutingFailure, 'businessId' | 'phoneNumberId' | 'agentId'> | null> {
    const config = await this.agentConfigRepository.findOne({
      where: { agentId },
    });
    if (!config?.voiceId) {
      return null;
    }

    const voice = await this.voiceAssetRepository.findOne({
      where: { id: config.voiceId },
    });
    if (!voice || voice.status !== 'active') {
      return this.buildFailure('VOICE_NOT_READY', 'voice_asset');
    }

    if (voice.sourceType === 'business_clone') {
      if (voice.businessId && voice.businessId !== businessId) {
        return this.buildFailure('VOICE_NOT_READY', 'voice_business');
      }
      const clone = await this.voiceCloneRepository.findOne({
        where: { voiceAssetId: voice.id, businessId },
      });
      if (!clone || clone.status !== 'ready') {
        return this.buildFailure('VOICE_NOT_READY', 'voice_clone');
      }
    }

    const voiceMapping = await this.voiceMappingRepository.findOne({
      where: { voiceAssetId: voice.id, provider: ELEVENLABS_PROVIDER },
    });
    if (voice.sourceType === 'provider_catalog' && !voiceMapping?.externalVoiceId) {
      return this.buildFailure('VOICE_NOT_READY', 'voice_mapping');
    }

    return null;
  }

  private buildFailure(
    code: RoutingFailure['code'],
    stage: string,
  ): Omit<RoutingFailure, 'businessId' | 'phoneNumberId' | 'agentId'> {
    return {
      code,
      stage,
      safeMessage: FAILURE_MESSAGES[code],
    };
  }

  private fail(
    code: RoutingFailure['code'],
    stage: string,
    ids: Partial<Pick<RoutingFailure, 'businessId' | 'phoneNumberId' | 'agentId'>> = {},
  ): RoutingResult {
    return {
      ok: false,
      failure: {
        code,
        stage,
        safeMessage: FAILURE_MESSAGES[code],
        ...ids,
      },
    };
  }
}
