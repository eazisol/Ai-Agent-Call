import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  VOICE_CATALOG_PORT,
  type CatalogVoiceEntry,
  type VoiceCatalogPort,
} from '../../providers/voice-catalog.port';
import { AgentConfig } from '../agents/entities/agent-config.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  VoiceAsset,
  type VoiceAssetSourceType,
  type VoiceAssetStatus,
  type VoiceGenderPresentation,
} from './entities/voice-asset.entity';
import { VoiceProviderMapping } from './entities/voice-provider-mapping.entity';
import { assertVoiceCan } from './voice-permissions';

export const ELEVENLABS_VOICE_PROVIDER = 'elevenlabs';

export type VoiceSummaryView = {
  id: string;
  displayName: string;
  description: string | null;
  languageCodes: string[];
  genderPresentation: VoiceGenderPresentation;
  accent: string | null;
  styleLabels: string[];
  sourceType: VoiceAssetSourceType;
  businessOwned: boolean;
  previewSampleText: string | null;
  previewAudioUrl: string | null;
};

export type VoiceDetailView = VoiceSummaryView & {
  status: VoiceAssetStatus;
  assignedAgentCount: number;
  assignedAgents: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
};

export type AgentVoiceAssignmentView = {
  agentId: string;
  voiceId: string | null;
  voice: VoiceSummaryView | null;
  voicePreference: string;
  warnings: string[];
};

export type VoicePreviewView = {
  contentType: string;
  audioBase64: string;
};

export type ListVoicesOptions = {
  q?: string;
  language?: string;
  genderPresentation?: VoiceGenderPresentation;
  accent?: string;
  sourceType?: VoiceAssetSourceType;
  page?: number;
  limit?: number;
};

@Injectable()
export class VoiceCatalogSyncService {
  private readonly logger = new Logger(VoiceCatalogSyncService.name);
  private lastSyncedAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @Inject(VOICE_CATALOG_PORT)
    private readonly catalog: VoiceCatalogPort,
    @InjectRepository(VoiceAsset)
    private readonly assets: Repository<VoiceAsset>,
    @InjectRepository(VoiceProviderMapping)
    private readonly mappings: Repository<VoiceProviderMapping>,
    @InjectRepository(AgentConfig)
    private readonly agentConfigs: Repository<AgentConfig>,
  ) {}

  async refreshIfStale(force = false): Promise<void> {
    if (!this.catalog.isConfigured()) {
      return;
    }

    const ttlSeconds =
      this.config.get<number>('voices.catalogCacheTtlSeconds') ?? 3600;
    const ttlMs = Math.max(ttlSeconds, 60) * 1000;
    if (!force && Date.now() - this.lastSyncedAt < ttlMs) {
      return;
    }

    try {
      const entries = await this.catalog.listVoices();
      await this.upsertCatalogueEntries(entries);
      await this.archiveMissingCatalogueEntries(
        new Set(entries.map((entry) => entry.externalVoiceId)),
      );
      this.lastSyncedAt = Date.now();
      this.logger.log(
        `Refreshed voice catalogue (${entries.length} provider voices)`,
      );
    } catch (error) {
      const cachedCount = await this.assets.count({
        where: { sourceType: 'provider_catalog', status: 'active' },
      });
      if (cachedCount > 0) {
        this.logger.warn(
          `Voice catalogue refresh failed; serving ${cachedCount} cached voice(s).`,
        );
        return;
      }
      throw error;
    }
  }

  private async upsertCatalogueEntries(
    entries: CatalogVoiceEntry[],
  ): Promise<void> {
    for (const entry of entries) {
      const existingMapping = await this.mappings.findOne({
        where: {
          provider: this.catalog.providerName,
          externalVoiceId: entry.externalVoiceId,
        },
        relations: { voiceAsset: true },
      });

      if (existingMapping?.voiceAsset) {
        existingMapping.metadata = entry.metadata;
        existingMapping.voiceAsset.displayName = entry.displayName;
        existingMapping.voiceAsset.description = entry.description;
        existingMapping.voiceAsset.languageCodes = entry.languageCodes;
        existingMapping.voiceAsset.genderPresentation =
          entry.genderPresentation;
        existingMapping.voiceAsset.accent = entry.accent;
        existingMapping.voiceAsset.styleLabels = entry.styleLabels;
        existingMapping.voiceAsset.previewSampleText = entry.previewSampleText;
        existingMapping.voiceAsset.status = 'active';
        await this.mappings.save(existingMapping);
        continue;
      }

      await this.dataSource.transaction(async (manager) => {
        const asset = manager.create(VoiceAsset, {
          businessId: null,
          sourceType: 'provider_catalog',
          displayName: entry.displayName,
          description: entry.description,
          languageCodes: entry.languageCodes,
          genderPresentation: entry.genderPresentation,
          accent: entry.accent,
          styleLabels: entry.styleLabels,
          previewSampleText: entry.previewSampleText,
          status: 'active',
        });
        const savedAsset = await manager.save(asset);
        const mapping = manager.create(VoiceProviderMapping, {
          voiceAssetId: savedAsset.id,
          provider: this.catalog.providerName,
          externalVoiceId: entry.externalVoiceId,
          metadata: entry.metadata,
        });
        await manager.save(mapping);
      });
    }
  }

  private async archiveMissingCatalogueEntries(
    currentExternalIds: Set<string>,
  ): Promise<void> {
    const catalogueMappings = await this.mappings.find({
      where: { provider: this.catalog.providerName },
      relations: { voiceAsset: true },
    });

    for (const mapping of catalogueMappings) {
      if (currentExternalIds.has(mapping.externalVoiceId)) {
        continue;
      }
      const asset = mapping.voiceAsset;
      if (!asset || asset.sourceType !== 'provider_catalog') {
        continue;
      }
      const assignedCount = await this.agentConfigs.count({
        where: { voiceId: asset.id },
      });
      if (assignedCount > 0) {
        continue;
      }
      asset.status = 'archived';
      await this.assets.save(asset);
    }
  }
}

@Injectable()
export class VoicesService {
  private readonly logger = new Logger(VoicesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    private readonly catalogSync: VoiceCatalogSyncService,
    @Inject(VOICE_CATALOG_PORT)
    private readonly catalog: VoiceCatalogPort,
    @InjectRepository(VoiceAsset)
    private readonly assets: Repository<VoiceAsset>,
    @InjectRepository(VoiceProviderMapping)
    private readonly mappings: Repository<VoiceProviderMapping>,
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    @InjectRepository(AgentConfig)
    private readonly agentConfigs: Repository<AgentConfig>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  async listForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    options: ListVoicesOptions = {},
  ): Promise<{ voices: VoiceSummaryView[]; total: number; page: number; limit: number }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCan(membership.role, 'list_voices');
    await this.requireActiveBusiness(organizationId, businessId);

    await this.catalogSync.refreshIfStale();

    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.assets
      .createQueryBuilder('asset')
      .where('asset.status = :active', { active: 'active' })
      .andWhere(
        '(asset.businessId IS NULL OR asset.businessId = :businessId)',
        { businessId },
      )
      .orderBy('asset.displayName', 'ASC');

    if (options.sourceType) {
      qb.andWhere('asset.sourceType = :sourceType', {
        sourceType: options.sourceType,
      });
    }

    if (options.genderPresentation) {
      qb.andWhere('asset.genderPresentation = :genderPresentation', {
        genderPresentation: options.genderPresentation,
      });
    }

    if (options.accent?.trim()) {
      qb.andWhere('LOWER(asset.accent) LIKE LOWER(:accent)', {
        accent: `${options.accent.trim()}%`,
      });
    }

    if (options.language?.trim()) {
      const language = options.language.trim().toLowerCase();
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(asset.language_codes) lang
          WHERE LOWER(lang) = :language OR LOWER(lang) LIKE :languagePrefix
        )`,
        { language, languagePrefix: `${language}-%` },
      );
    }

    if (options.q?.trim()) {
      const q = `%${options.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(asset.displayName) LIKE :q OR LOWER(COALESCE(asset.description, '')) LIKE :q)`,
        { q },
      );
    }

    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const previewUrls = await this.previewAudioUrlsForAssets(
      rows.map((row) => row.id),
    );
    return {
      voices: rows.map((row) =>
        this.toSummary(row, previewUrls.get(row.id) ?? null),
      ),
      total,
      page,
      limit,
    };
  }

  async getForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    voiceId: string,
  ): Promise<VoiceDetailView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCan(membership.role, 'view_voice');
    await this.requireActiveBusiness(organizationId, businessId);

    const asset = await this.findEligibleAsset(voiceId, businessId);
    const mapping = await this.mappings.findOne({
      where: {
        voiceAssetId: asset.id,
        provider: this.catalog.providerName,
      },
    });
    const assignedAgents = await this.listAssignedAgents(asset.id, businessId);
    return {
      ...this.toSummary(
        asset,
        this.extractPreviewAudioUrl(mapping?.metadata),
      ),
      status: asset.status,
      assignedAgentCount: assignedAgents.length,
      assignedAgents,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  async previewForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    voiceId: string,
    sampleText?: string,
  ): Promise<VoicePreviewView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCan(membership.role, 'preview_voice');
    await this.requireActiveBusiness(organizationId, businessId);

    if (!this.catalog.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'Voice preview is not configured on the server.',
        503,
      );
    }

    const asset = await this.findEligibleAsset(voiceId, businessId);
    const mapping = await this.requireProviderMapping(asset.id);
    const preview = await this.catalog.previewVoice({
      externalVoiceId: mapping.externalVoiceId,
      sampleText: sampleText ?? asset.previewSampleText,
      catalogPreviewUrl:
        typeof mapping.metadata?.previewUrl === 'string'
          ? mapping.metadata.previewUrl
          : null,
    });

    return {
      contentType: preview.contentType,
      audioBase64: preview.audioBytes.toString('base64'),
    };
  }

  async getAgentVoiceForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentVoiceAssignmentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCan(membership.role, 'view_agent_voice');
    await this.requireActiveBusiness(organizationId, businessId);

    const agent = await this.findOwnedAgent(businessId, agentId);
    const config = agent.config;
    if (!config) {
      throw new ApplicationError(
        'AGENT_NOT_FOUND',
        'Agent configuration was not found.',
        404,
      );
    }

    let voice: VoiceSummaryView | null = null;
    if (config.voiceId) {
      const asset = await this.findEligibleAsset(config.voiceId, businessId);
      const mapping = await this.mappings.findOne({
        where: {
          voiceAssetId: asset.id,
          provider: this.catalog.providerName,
        },
      });
      voice = this.toSummary(
        asset,
        this.extractPreviewAudioUrl(mapping?.metadata),
      );
    }

    return {
      agentId: agent.id,
      voiceId: config.voiceId,
      voice,
      voicePreference: config.voicePreference ?? 'neutral',
      warnings: [],
    };
  }

  async assignAgentVoiceForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
    voiceId: string,
  ): Promise<AgentVoiceAssignmentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCan(membership.role, 'assign_agent_voice');
    const business = await this.requireActiveBusiness(organizationId, businessId);

    const agent = await this.findOwnedAgent(businessId, agentId);
    const config = agent.config;
    if (!config) {
      throw new ApplicationError(
        'AGENT_NOT_FOUND',
        'Agent configuration was not found.',
        404,
      );
    }

    const asset = await this.findEligibleAsset(voiceId, businessId);
    if (asset.status !== 'active') {
      throw new ApplicationError(
        'VOICE_NOT_ELIGIBLE',
        'This voice is not available for assignment.',
        400,
      );
    }

    const mapping = await this.mappings.findOne({
      where: {
        voiceAssetId: asset.id,
        provider: this.catalog.providerName,
      },
    });
    const warnings = this.buildCompatibilityWarnings(asset, agent, business);
    config.voiceId = asset.id;
    await this.agentConfigs.save(config);

    this.logger.log(
      `Assigned voice ${asset.id} to agent ${agentId} in business ${businessId}`,
    );

    return {
      agentId: agent.id,
      voiceId: asset.id,
      voice: this.toSummary(
        asset,
        this.extractPreviewAudioUrl(mapping?.metadata),
      ),
      voicePreference: config.voicePreference ?? 'neutral',
      warnings,
    };
  }

  async clearAgentVoiceForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentVoiceAssignmentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCan(membership.role, 'assign_agent_voice');
    await this.requireActiveBusiness(organizationId, businessId);

    const agent = await this.findOwnedAgent(businessId, agentId);
    const config = agent.config;
    if (!config) {
      throw new ApplicationError(
        'AGENT_NOT_FOUND',
        'Agent configuration was not found.',
        404,
      );
    }

    config.voiceId = null;
    await this.agentConfigs.save(config);

    return {
      agentId: agent.id,
      voiceId: null,
      voice: null,
      voicePreference: config.voicePreference ?? 'neutral',
      warnings: [],
    };
  }

  async getSummariesForIds(
    voiceIds: string[],
    businessId: string,
  ): Promise<Map<string, VoiceSummaryView>> {
    const uniqueIds = [...new Set(voiceIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const rows = await this.assets
      .createQueryBuilder('asset')
      .where('asset.id IN (:...ids)', { ids: uniqueIds })
      .andWhere('asset.status = :active', { active: 'active' })
      .andWhere(
        '(asset.businessId IS NULL OR asset.businessId = :businessId)',
        { businessId },
      )
      .getMany();

    const previewUrls = await this.previewAudioUrlsForAssets(
      rows.map((row) => row.id),
    );
    return new Map(
      rows.map((row) => [
        row.id,
        this.toSummary(row, previewUrls.get(row.id) ?? null),
      ]),
    );
  }

  async resolveExternalVoiceId(voiceId: string | null): Promise<string | null> {
    if (!voiceId) {
      return null;
    }
    const mapping = await this.mappings.findOne({
      where: { voiceAssetId: voiceId, provider: this.catalog.providerName },
    });
    return mapping?.externalVoiceId ?? null;
  }

  private buildCompatibilityWarnings(
    asset: VoiceAsset,
    agent: Agent,
    business: Business,
  ): string[] {
    const warnings: string[] = [];
    const effectiveLanguages = this.resolveEffectiveLanguages(agent, business);
    const voiceLanguages = new Set(
      (asset.languageCodes ?? []).map((code) => code.toLowerCase()),
    );

    if (voiceLanguages.size === 0 || effectiveLanguages.length === 0) {
      return warnings;
    }

    for (const language of effectiveLanguages) {
      const normalized = language.toLowerCase();
      const primary = normalized.split('-')[0] ?? normalized;
      const supported =
        voiceLanguages.has(normalized) ||
        voiceLanguages.has(primary) ||
        [...voiceLanguages].some(
          (code) =>
            code === primary ||
            code.startsWith(`${primary}-`) ||
            normalized.startsWith(`${code}-`),
        );
      if (!supported) {
        warnings.push(
          `Selected voice may not fully support ${language} configured for this agent.`,
        );
      }
    }

    return warnings;
  }

  private resolveEffectiveLanguages(agent: Agent, business: Business): string[] {
    const config = agent.config;
    if (!config) {
      return [business.defaultLanguage ?? 'en'];
    }
    if (config.useBusinessLanguageSettings !== false) {
      if (Array.isArray(business.languages) && business.languages.length > 0) {
        return business.languages;
      }
      return [business.defaultLanguage ?? 'en'];
    }
    if (Array.isArray(config.languages) && config.languages.length > 0) {
      return config.languages;
    }
    return [config.language ?? business.defaultLanguage ?? 'en'];
  }

  private async listAssignedAgents(
    voiceId: string,
    businessId: string,
  ): Promise<{ id: string; name: string }[]> {
    const configs = await this.agentConfigs
      .createQueryBuilder('config')
      .innerJoinAndSelect('config.agent', 'agent')
      .where('config.voiceId = :voiceId', { voiceId })
      .andWhere('agent.businessId = :businessId', { businessId })
      .getMany();

    return configs.map((config) => ({
      id: config.agent.id,
      name: config.agent.name,
    }));
  }

  private async findEligibleAsset(
    voiceId: string,
    businessId: string,
  ): Promise<VoiceAsset> {
    const asset = await this.assets.findOne({ where: { id: voiceId } });
    if (!asset) {
      throw new ApplicationError(
        'VOICE_NOT_FOUND',
        'Voice was not found.',
        404,
      );
    }
    if (asset.businessId != null && asset.businessId !== businessId) {
      throw new ApplicationError(
        'VOICE_NOT_ELIGIBLE',
        'This voice is not available for the active business.',
        403,
      );
    }
    return asset;
  }

  private async requireProviderMapping(
    voiceAssetId: string,
  ): Promise<VoiceProviderMapping> {
    const mapping = await this.mappings.findOne({
      where: { voiceAssetId, provider: this.catalog.providerName },
    });
    if (!mapping?.externalVoiceId) {
      throw new ApplicationError(
        'VOICE_NOT_FOUND',
        'Voice provider mapping was not found.',
        404,
      );
    }
    return mapping;
  }

  private async findOwnedAgent(
    businessId: string,
    agentId: string,
  ): Promise<Agent> {
    const agent = await this.agents.findOne({
      where: { id: agentId, businessId },
      relations: { config: true },
    });
    if (!agent) {
      throw new ApplicationError(
        'AGENT_NOT_FOUND',
        'Agent was not found for the active business.',
        404,
      );
    }
    return agent;
  }

  private async requireActiveBusiness(
    organizationId: string,
    businessId: string,
  ): Promise<Business> {
    const business = await this.businesses.findOne({
      where: { id: businessId, organizationId },
    });
    if (!business) {
      throw new ApplicationError(
        'BUSINESS_NOT_FOUND',
        'Business was not found for the active organization.',
        404,
      );
    }
    return business;
  }

  private toSummary(
    asset: VoiceAsset,
    previewAudioUrl: string | null = null,
  ): VoiceSummaryView {
    return {
      id: asset.id,
      displayName: asset.displayName,
      description: asset.description,
      languageCodes: Array.isArray(asset.languageCodes)
        ? asset.languageCodes
        : [],
      genderPresentation: asset.genderPresentation,
      accent: asset.accent,
      styleLabels: Array.isArray(asset.styleLabels) ? asset.styleLabels : [],
      sourceType: asset.sourceType,
      businessOwned: asset.businessId != null,
      previewSampleText: asset.previewSampleText,
      previewAudioUrl,
    };
  }

  private extractPreviewAudioUrl(
    metadata: Record<string, unknown> | null | undefined,
  ): string | null {
    return typeof metadata?.previewUrl === 'string' &&
      metadata.previewUrl.trim()
      ? metadata.previewUrl.trim()
      : null;
  }

  private async previewAudioUrlsForAssets(
    assetIds: string[],
  ): Promise<Map<string, string>> {
    if (assetIds.length === 0) {
      return new Map();
    }

    const rows = await this.mappings.find({
      where: {
        voiceAssetId: In(assetIds),
        provider: this.catalog.providerName,
      },
    });

    const urls = new Map<string, string>();
    for (const row of rows) {
      const previewUrl = this.extractPreviewAudioUrl(row.metadata);
      if (previewUrl) {
        urls.set(row.voiceAssetId, previewUrl);
      }
    }
    return urls;
  }
}