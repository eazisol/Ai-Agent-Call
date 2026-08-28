import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  isCatalogueLanguageCode,
  normalizeLanguageCode,
} from '../../common/i18n/language-catalogue';
import { Business } from '../businesses/entities/business.entity';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { assertAgentCan } from './agent-permissions';
import {
  AgentProviderSyncService,
  mapProviderMappings,
  type ProviderMappingView,
} from './agent-provider-sync.service';
import type { CreateAgentDto } from './dto/create-agent.dto';
import type { UpdateAgentDto } from './dto/update-agent.dto';
import { AgentConfig } from './entities/agent-config.entity';
import { AgentPrompt } from './entities/agent-prompt.entity';
import {
  AGENT_VOICE_PREFERENCES,
  Agent,
  type AgentLanguage,
  type AgentLanguageMode,
  type AgentStatus,
  type AgentVoicePreference,
} from './entities/agent.entity';

export interface AgentView {
  id: string;
  businessId: string;
  organizationId: string;
  name: string;
  status: AgentStatus;
  roleLabel: string;
  personality: string | null;
  greeting: string;
  instructions: string;
  useBusinessLanguageSettings: boolean;
  languageMode: AgentLanguageMode;
  language: AgentLanguage;
  languages: AgentLanguage[];
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  voicePreference: AgentVoicePreference;
  voiceId: string | null;
  escalationEnabled: boolean;
  escalationKeywords: string[];
  escalationContactPhone: string | null;
  escalationContactEmail: string | null;
  escalationMessage: string | null;
  providerMappings: ProviderMappingView[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @Inject(forwardRef(() => AgentProviderSyncService))
    private readonly providerSync: AgentProviderSyncService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    businessId: string,
    input: CreateAgentDto,
  ): Promise<AgentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'create_agent');
    const business = await this.requireActiveBusiness(
      organizationId,
      businessId,
    );

    const fields = this.normalizeCreate(input, business);

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const agent = await manager.save(
          Agent,
          manager.create(Agent, {
            businessId,
            name: fields.name,
            status: 'active',
          }),
        );

        await manager.save(
          AgentConfig,
          manager.create(AgentConfig, {
            agentId: agent.id,
            useBusinessLanguageSettings: fields.useBusinessLanguageSettings,
            languageMode: fields.languageMode,
            language: fields.language,
            languages: fields.languages,
            languageDetectionEnabled: fields.languageDetectionEnabled,
            languageSwitchingEnabled: fields.languageSwitchingEnabled,
            voicePreference: fields.voicePreference,
            escalationEnabled: fields.escalationEnabled,
            escalationKeywords: fields.escalationKeywords,
            escalationContactPhone: fields.escalationContactPhone,
            escalationContactEmail: fields.escalationContactEmail,
            escalationMessage: fields.escalationMessage,
            voiceId: null,
          }),
        );

        await manager.save(
          AgentPrompt,
          manager.create(AgentPrompt, {
            agentId: agent.id,
            roleLabel: fields.roleLabel,
            personality: fields.personality,
            greeting: fields.greeting,
            instructions: fields.instructions,
          }),
        );

        return agent;
      });

      this.logger.log(
        `Created agent ${saved.id} for business ${businessId} by user ${userId}`,
      );
      return this.getForUser(userId, organizationId, businessId, saved.id);
    } catch (error) {
      this.rethrowNameConflict(error);
      throw error;
    }
  }

  async listForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    includeArchived = false,
  ): Promise<AgentView[]> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'list_agents');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const qb = this.agents
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.config', 'config')
      .leftJoinAndSelect('agent.prompts', 'prompts')
      .leftJoinAndSelect('agent.providerMappings', 'providerMappings')
      .where('agent.businessId = :businessId', { businessId })
      .orderBy('agent.createdAt', 'ASC');

    if (!includeArchived) {
      qb.andWhere('agent.status <> :archived', { archived: 'archived' });
    }

    const rows = await qb.getMany();
    const business = await this.businesses.findOne({
      where: { id: businessId, organizationId },
    });
    return rows.map((row) =>
      this.toView(row, organizationId, membership.role, business),
    );
  }

  async getForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'view_agent');
    const business = await this.requireActiveBusiness(
      organizationId,
      businessId,
      {
        allowArchivedBusiness: true,
      },
    );

    const agent = await this.findOwnedAgent(businessId, agentId);
    return this.toView(agent, organizationId, membership.role, business);
  }

  async updateForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
    input: UpdateAgentDto,
  ): Promise<AgentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const keys = Object.entries(input).filter(
      ([, value]) => value !== undefined,
    );
    if (keys.length === 0) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'No agent fields provided to update.',
      );
    }

    const statusOnly = keys.every(([key]) => key === 'status');
    if (input.status !== undefined) {
      assertAgentCan(membership.role, 'archive_agent');
    }
    if (!statusOnly) {
      assertAgentCan(membership.role, 'update_agent');
    }

    const agent = await this.findOwnedAgent(businessId, agentId);

    if (input.name !== undefined) {
      agent.name = this.requireName(input.name);
    }
    if (input.status !== undefined) {
      agent.status = input.status;
    }

    const config = agent.config;
    const prompts = agent.prompts;
    if (!config || !prompts) {
      throw new ApplicationError('AGENT_NOT_FOUND', 'Agent not found.', 404);
    }

    const business = await this.businesses.findOne({
      where: { id: businessId, organizationId },
    });
    if (!business) {
      throw new ApplicationError(
        'ACTIVE_BUSINESS_REQUIRED',
        'Select an active business before managing agents.',
        400,
      );
    }

    if (
      input.useBusinessLanguageSettings !== undefined ||
      input.languageMode !== undefined ||
      input.language !== undefined ||
      input.languages !== undefined ||
      input.languageDetectionEnabled !== undefined ||
      input.languageSwitchingEnabled !== undefined
    ) {
      const customizeRequested =
        input.useBusinessLanguageSettings === false ||
        input.languageMode !== undefined ||
        input.languages !== undefined ||
        input.language !== undefined ||
        input.languageDetectionEnabled !== undefined ||
        input.languageSwitchingEnabled !== undefined;

      let useBusinessLanguageSettings =
        config.useBusinessLanguageSettings ?? true;
      if (input.useBusinessLanguageSettings === true) {
        useBusinessLanguageSettings = true;
      } else if (customizeRequested) {
        useBusinessLanguageSettings = false;
      }

      const languageFields = this.resolveAgentLanguageConfig({
        business,
        useBusinessLanguageSettings,
        languageMode: input.languageMode ?? config.languageMode,
        language: input.language ?? config.language,
        languages: input.languages ?? config.languages,
        languageDetectionEnabled:
          input.languageDetectionEnabled ?? config.languageDetectionEnabled,
        languageSwitchingEnabled:
          input.languageSwitchingEnabled ?? config.languageSwitchingEnabled,
        explicitMode: input.languageMode !== undefined,
        explicitDetection: input.languageDetectionEnabled !== undefined,
        explicitSwitching: input.languageSwitchingEnabled !== undefined,
      });
      Object.assign(config, languageFields);
    }
    if (input.voicePreference !== undefined) {
      config.voicePreference = this.requireVoicePreference(
        input.voicePreference,
      );
    }
    if (input.escalationEnabled !== undefined) {
      config.escalationEnabled = input.escalationEnabled;
    }
    if (input.escalationKeywords !== undefined) {
      config.escalationKeywords = this.normalizeKeywords(
        input.escalationKeywords,
      );
    }
    if (input.escalationContactPhone !== undefined) {
      config.escalationContactPhone = this.normalizePhone(
        input.escalationContactPhone,
      );
    }
    if (input.escalationContactEmail !== undefined) {
      config.escalationContactEmail = this.normalizeEmail(
        input.escalationContactEmail,
      );
    }
    if (input.escalationMessage !== undefined) {
      config.escalationMessage = this.nullableTrim(
        input.escalationMessage,
        2000,
      );
    }

    if (input.roleLabel !== undefined) {
      prompts.roleLabel = this.requireRoleLabel(input.roleLabel);
    }
    if (input.personality !== undefined) {
      prompts.personality = this.nullableTrim(input.personality, 4000);
    }
    if (input.greeting !== undefined) {
      prompts.greeting = this.requireGreeting(input.greeting);
    }
    if (input.instructions !== undefined) {
      prompts.instructions = this.requireInstructions(input.instructions);
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Agent, agent);
        await manager.save(AgentConfig, config);
        await manager.save(AgentPrompt, prompts);
      });
    } catch (error) {
      this.rethrowNameConflict(error);
      throw error;
    }

    return this.getForUser(userId, organizationId, businessId, agentId);
  }

  async activateForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'activate_agent');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const agent = await this.findOwnedAgent(businessId, agentId);
    if (agent.status === 'archived') {
      throw new ApplicationError(
        'AGENT_ARCHIVED',
        'Archived agents cannot be activated. Unarchive first.',
        400,
      );
    }
    agent.status = 'active';
    await this.agents.save(agent);
    return this.getForUser(userId, organizationId, businessId, agentId);
  }

  async deactivateForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'activate_agent');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const agent = await this.findOwnedAgent(businessId, agentId);
    if (agent.status === 'archived') {
      throw new ApplicationError(
        'AGENT_ARCHIVED',
        'Archived agents cannot be deactivated. Unarchive first.',
        400,
      );
    }
    agent.status = 'inactive';
    await this.agents.save(agent);
    return this.getForUser(userId, organizationId, businessId, agentId);
  }

  async archiveForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentView> {
    const view = await this.updateForUser(
      userId,
      organizationId,
      businessId,
      agentId,
      {
        status: 'archived',
      },
    );
    await this.providerSync.bestEffortDeactivateRemote(agentId);
    return view;
  }

  async deleteForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<{ deleted: true }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'delete_agent');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const agent = await this.findOwnedAgent(businessId, agentId);
    const dependents = await this.countNonCascadingDependents(agent.id);
    if (dependents > 0) {
      throw new ApplicationError(
        'AGENT_HAS_DEPENDENTS',
        'This agent has related records. Archive it instead of deleting.',
        409,
      );
    }

    await this.providerSync.bestEffortDeleteRemote(agent.id);
    await this.agents.delete({ id: agent.id });
    this.logger.log(
      `Deleted agent ${agent.id} for business ${businessId} by user ${userId}`,
    );
    return { deleted: true };
  }

  private async countNonCascadingDependents(_agentId: string): Promise<number> {
    // M05: child tables cascade. Phone/call FKs arrive in later modules.
    return 0;
  }

  private async requireActiveBusiness(
    organizationId: string,
    businessId: string,
    options: { allowArchivedBusiness?: boolean } = {},
  ): Promise<Business> {
    const business = await this.businesses.findOne({
      where: { id: businessId, organizationId },
    });
    if (!business || !business.organizationId) {
      throw new ApplicationError(
        'ACTIVE_BUSINESS_REQUIRED',
        'Select an active business before managing agents.',
        400,
      );
    }
    if (!options.allowArchivedBusiness && business.status === 'archived') {
      throw new ApplicationError(
        'BUSINESS_ARCHIVED',
        'Archived businesses cannot manage agents. Reactivate the business first.',
        400,
      );
    }
    return business;
  }

  private async findOwnedAgent(
    businessId: string,
    agentId: string,
  ): Promise<Agent> {
    const agent = await this.agents.findOne({
      where: { id: agentId, businessId },
      relations: { config: true, prompts: true, providerMappings: true },
    });
    if (!agent) {
      throw new ApplicationError('AGENT_NOT_FOUND', 'Agent not found.', 404);
    }
    return agent;
  }

  private normalizeCreate(input: CreateAgentDto, business: Business) {
    const inheritsBusiness =
      input.useBusinessLanguageSettings !== false &&
      input.languageMode === undefined &&
      (input.languages === undefined || input.languages.length === 0) &&
      input.languageDetectionEnabled === undefined &&
      input.languageSwitchingEnabled === undefined;

    const languageFields = this.resolveAgentLanguageConfig({
      business,
      useBusinessLanguageSettings: inheritsBusiness
        ? true
        : input.useBusinessLanguageSettings === true,
      languageMode: input.languageMode,
      language: input.language,
      languages: input.languages,
      languageDetectionEnabled: input.languageDetectionEnabled,
      languageSwitchingEnabled: input.languageSwitchingEnabled,
      explicitMode: input.languageMode !== undefined,
      explicitDetection: input.languageDetectionEnabled !== undefined,
      explicitSwitching: input.languageSwitchingEnabled !== undefined,
    });

    return {
      name: this.requireName(input.name),
      roleLabel: this.requireRoleLabel(input.roleLabel),
      personality: this.nullableTrim(input.personality, 4000),
      greeting: this.requireGreeting(input.greeting),
      instructions: this.requireInstructions(input.instructions),
      ...languageFields,
      voicePreference: this.requireVoicePreference(
        input.voicePreference ?? 'neutral',
      ),
      escalationEnabled: input.escalationEnabled === true,
      escalationKeywords: this.normalizeKeywords(input.escalationKeywords),
      escalationContactPhone: this.normalizePhone(input.escalationContactPhone),
      escalationContactEmail: this.normalizeEmail(input.escalationContactEmail),
      escalationMessage: this.nullableTrim(input.escalationMessage, 2000),
    };
  }

  private resolveAgentLanguageConfig(input: {
    business: Business;
    useBusinessLanguageSettings: boolean;
    languageMode?: AgentLanguageMode;
    language?: string;
    languages?: string[];
    languageDetectionEnabled?: boolean;
    languageSwitchingEnabled?: boolean;
    explicitMode?: boolean;
    explicitDetection?: boolean;
    explicitSwitching?: boolean;
  }): {
    useBusinessLanguageSettings: boolean;
    languageMode: AgentLanguageMode;
    language: AgentLanguage;
    languages: AgentLanguage[];
    languageDetectionEnabled: boolean;
    languageSwitchingEnabled: boolean;
  } {
    const businessLanguages = this.businessLanguages(input.business);

    if (input.useBusinessLanguageSettings) {
      const multi = businessLanguages.length > 1;
      return {
        useBusinessLanguageSettings: true,
        languageMode: multi ? 'multilingual' : 'single',
        language: this.requireLanguage(input.business.defaultLanguage || 'en'),
        languages: businessLanguages,
        languageDetectionEnabled:
          multi && input.business.languageDetectionEnabled === true,
        languageSwitchingEnabled:
          multi &&
          input.business.languageDetectionEnabled === true &&
          input.business.languageSwitchingEnabled === true,
      };
    }

    const languageMode: AgentLanguageMode =
      input.languageMode ??
      (input.languages && input.languages.length > 1
        ? 'multilingual'
        : 'single');

    if (languageMode === 'single') {
      const only = this.requireLanguage(
        input.language ??
          input.languages?.[0] ??
          input.business.defaultLanguage ??
          'en',
      );
      this.assertSubsetOfBusiness([only], businessLanguages);
      if (
        (input.explicitDetection && input.languageDetectionEnabled === true) ||
        (input.explicitSwitching && input.languageSwitchingEnabled === true)
      ) {
        throw new ApplicationError(
          'INVALID_LANGUAGE',
          'Single-language mode cannot enable detection or switching.',
        );
      }
      return {
        useBusinessLanguageSettings: false,
        languageMode: 'single',
        language: only,
        languages: [only],
        languageDetectionEnabled: false,
        languageSwitchingEnabled: false,
      };
    }

    const languages = this.requireLanguages(
      input.languages?.length
        ? input.languages
        : [input.language ?? input.business.defaultLanguage ?? 'en'],
    );
    this.assertSubsetOfBusiness(languages, businessLanguages);
    const language = this.requireLanguage(
      input.language ?? input.business.defaultLanguage ?? languages[0]!,
    );
    if (!languages.includes(language)) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Default language must be one of the selected languages.',
      );
    }

    const multi = languages.length > 1;
    if (!multi) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Multilingual mode requires at least two supported languages.',
      );
    }

    const languageDetectionEnabled = input.explicitDetection
      ? input.languageDetectionEnabled === true
      : true;
    const languageSwitchingEnabled = input.explicitSwitching
      ? input.languageSwitchingEnabled === true
      : languageDetectionEnabled;

    if (!languageDetectionEnabled && languageSwitchingEnabled) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Language switching requires automatic language detection.',
      );
    }

    return {
      useBusinessLanguageSettings: false,
      languageMode: 'multilingual',
      language,
      languages,
      languageDetectionEnabled,
      languageSwitchingEnabled:
        languageDetectionEnabled && languageSwitchingEnabled,
    };
  }

  private businessLanguages(business: Business): AgentLanguage[] {
    if (Array.isArray(business.languages) && business.languages.length > 0) {
      return this.requireLanguages(business.languages);
    }
    return [this.requireLanguage(business.defaultLanguage || 'en')];
  }

  private assertSubsetOfBusiness(
    agentLanguages: AgentLanguage[],
    businessLanguages: AgentLanguage[],
  ): void {
    const allowed = new Set(businessLanguages);
    for (const code of agentLanguages) {
      if (!allowed.has(code)) {
        throw new ApplicationError(
          'INVALID_LANGUAGE',
          `Language "${code}" is not enabled for this business. Update business languages first.`,
        );
      }
    }
  }

  private requireLanguages(languages: string[]): AgentLanguage[] {
    if (!languages?.length) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Select at least one language.',
      );
    }
    const unique: AgentLanguage[] = [];
    const seen = new Set<string>();
    for (const language of languages) {
      const normalized = this.requireLanguage(language);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(normalized);
      }
    }
    return unique;
  }

  private requireVoicePreference(value: string): AgentVoicePreference {
    if (!AGENT_VOICE_PREFERENCES.includes(value as AgentVoicePreference)) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Voice preference must be female, male, or neutral.',
      );
    }
    return value as AgentVoicePreference;
  }

  private requireName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ApplicationError('INVALID_AGENT', 'Agent name is required.');
    }
    if (trimmed.length > 150) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Agent name must be at most 150 characters.',
      );
    }
    return trimmed;
  }

  private requireRoleLabel(roleLabel: string): string {
    const trimmed = roleLabel.trim();
    if (!trimmed) {
      throw new ApplicationError('INVALID_AGENT', 'Role label is required.');
    }
    if (trimmed.length > 100) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Role label must be at most 100 characters.',
      );
    }
    return trimmed;
  }

  private requireGreeting(greeting: string): string {
    const trimmed = greeting.trim();
    if (!trimmed) {
      throw new ApplicationError('INVALID_AGENT', 'Greeting is required.');
    }
    if (trimmed.length > 2000) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Greeting must be at most 2000 characters.',
      );
    }
    return trimmed;
  }

  private requireInstructions(instructions: string): string {
    const trimmed = instructions.trim();
    if (!trimmed) {
      throw new ApplicationError('INVALID_AGENT', 'Instructions are required.');
    }
    if (trimmed.length > 20000) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Instructions must be at most 20000 characters.',
      );
    }
    return trimmed;
  }

  private requireLanguage(language: string): AgentLanguage {
    const normalized = normalizeLanguageCode(language);
    if (!isCatalogueLanguageCode(normalized)) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Language must be a supported catalogue language code (e.g. en, ur, fr).',
      );
    }
    return normalized;
  }

  private normalizeKeywords(keywords?: string[]): string[] {
    if (!keywords?.length) {
      return [];
    }
    const unique = new Set<string>();
    for (const keyword of keywords) {
      const trimmed = keyword.trim();
      if (trimmed) {
        unique.add(trimmed.slice(0, 80));
      }
    }
    return [...unique].slice(0, 50);
  }

  private normalizePhone(phone?: string | null): string | null {
    if (phone === undefined || phone === null) {
      return null;
    }
    const trimmed = phone.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^\+?[0-9()\-\s.]{7,30}$/.test(trimmed)) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Escalation phone number format is invalid.',
      );
    }
    return trimmed;
  }

  private normalizeEmail(email?: string | null): string | null {
    if (email === undefined || email === null) {
      return null;
    }
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (!normalized.includes('@')) {
      throw new ApplicationError(
        'INVALID_AGENT',
        'Escalation email format is invalid.',
      );
    }
    return normalized;
  }

  private nullableTrim(
    value: string | null | undefined,
    max: number,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.slice(0, max);
  }

  private rethrowNameConflict(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      typeof error.message === 'string' &&
      error.message.includes('uq_ai_agents_business_lower_name_non_archived')
    ) {
      throw new ApplicationError(
        'AGENT_NAME_CONFLICT',
        'An agent with this name already exists for this business.',
        409,
      );
    }
  }

  private toView(
    agent: Agent,
    organizationId: string,
    _role: OrganizationMemberRole,
    business: Business | null,
  ): AgentView {
    const config = agent.config;
    const prompts = agent.prompts;
    if (!config || !prompts) {
      throw new ApplicationError('AGENT_NOT_FOUND', 'Agent not found.', 404);
    }

    const useBusiness =
      config.useBusinessLanguageSettings !== false && business != null;
    const effective = useBusiness
      ? this.resolveAgentLanguageConfig({
          business,
          useBusinessLanguageSettings: true,
        })
      : {
          useBusinessLanguageSettings: false,
          languageMode: config.languageMode ?? 'single',
          language: config.language,
          languages:
            Array.isArray(config.languages) && config.languages.length
              ? config.languages
              : [config.language],
          languageDetectionEnabled: config.languageDetectionEnabled === true,
          languageSwitchingEnabled: config.languageSwitchingEnabled === true,
        };

    return {
      id: agent.id,
      businessId: agent.businessId,
      organizationId,
      name: agent.name,
      status: agent.status,
      roleLabel: prompts.roleLabel,
      personality: prompts.personality,
      greeting: prompts.greeting,
      instructions: prompts.instructions,
      useBusinessLanguageSettings: effective.useBusinessLanguageSettings,
      languageMode: effective.languageMode,
      language: effective.language,
      languages: effective.languages,
      languageDetectionEnabled: effective.languageDetectionEnabled,
      languageSwitchingEnabled: effective.languageSwitchingEnabled,
      voicePreference: config.voicePreference ?? 'neutral',
      voiceId: config.voiceId,
      escalationEnabled: config.escalationEnabled,
      escalationKeywords: Array.isArray(config.escalationKeywords)
        ? config.escalationKeywords
        : [],
      escalationContactPhone: config.escalationContactPhone,
      escalationContactEmail: config.escalationContactEmail,
      escalationMessage: config.escalationMessage,
      providerMappings: mapProviderMappings(agent.providerMappings),
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
