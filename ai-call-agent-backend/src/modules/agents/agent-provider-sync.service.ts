import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  VOICE_AGENT_SYNC_PORT,
  type ProviderAgentCreateInput,
  type VoiceAgentSyncPort,
} from '../../providers/voice-agent-sync.port';
import { OrganizationsService } from '../organizations/organizations.service';
import { assertAgentCan } from './agent-permissions';
import { AgentsService, type AgentView } from './agents.service';
import {
  AgentProviderMapping,
  type AgentProviderSyncStatus,
} from './entities/agent-provider-mapping.entity';

export const ELEVENLABS_PROVIDER = 'elevenlabs';

/** Ignore concurrent sync if pending older than this (ms). */
const PENDING_STALE_MS = 60_000;

export type ProviderMappingView = {
  provider: string;
  syncStatus: AgentProviderSyncStatus;
  externalAgentId: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
};

export type AgentSyncResultView = {
  provider: string;
  syncStatus: AgentProviderSyncStatus;
  externalAgentId: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  warnings: string[];
};

export type AgentProviderStatusView = {
  provider: string;
  syncStatus: AgentProviderSyncStatus;
  externalAgentId: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  remote: {
    checked: boolean;
    exists: boolean | null;
    name: string | null;
    rawStatus: string | null;
  };
};

@Injectable()
export class AgentProviderSyncService {
  private readonly logger = new Logger(AgentProviderSyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    @Inject(VOICE_AGENT_SYNC_PORT)
    private readonly voiceSync: VoiceAgentSyncPort,
    @Inject(forwardRef(() => AgentsService))
    private readonly agents: AgentsService,
    @InjectRepository(AgentProviderMapping)
    private readonly mappings: Repository<AgentProviderMapping>,
  ) {}

  async syncForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<{ agent: AgentView; sync: AgentSyncResultView }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'update_agent');

    // Ensures tenant ownership + loads effective language projection.
    const agent = await this.agents.getForUser(
      userId,
      organizationId,
      businessId,
      agentId,
    );

    if (agent.status === 'archived') {
      throw new ApplicationError(
        'AGENT_ARCHIVED',
        'Archived agents cannot be synced. Unarchive first.',
        400,
      );
    }

    if (!this.voiceSync.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'ElevenLabs is not configured on the server.',
        503,
      );
    }

    const input = this.toProviderInput(agent);
    let mapping = await this.beginPending(agentId);

    try {
      const result = mapping.externalAgentId
        ? await this.voiceSync.update(mapping.externalAgentId, input)
        : await this.voiceSync.create(input);

      mapping = await this.markSynced(mapping.id, result.externalAgentId);
      this.logger.log(
        `Synced agent ${agentId} → ${this.voiceSync.providerName}:${result.externalAgentId}`,
      );

      const refreshed = await this.agents.getForUser(
        userId,
        organizationId,
        businessId,
        agentId,
      );

      return {
        agent: refreshed,
        sync: {
          provider: ELEVENLABS_PROVIDER,
          syncStatus: mapping.syncStatus,
          externalAgentId: mapping.externalAgentId,
          lastSyncedAt: mapping.lastSyncedAt,
          lastError: mapping.lastError,
          warnings: result.warnings,
        },
      };
    } catch (error) {
      const safe = this.sanitizeError(error);
      await this.markError(mapping.id, safe.message);
      this.logger.warn(
        `Provider sync failed for agent ${agentId}: ${safe.code} — ${safe.message}`,
      );
      throw new ApplicationError(safe.code, safe.message, safe.statusCode);
    }
  }

  async getStatusForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentProviderStatusView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertAgentCan(membership.role, 'view_agent');

    // Ownership check
    await this.agents.getForUser(userId, organizationId, businessId, agentId);

    const mapping = await this.mappings.findOne({
      where: { agentId, provider: ELEVENLABS_PROVIDER },
    });

    if (!mapping) {
      return {
        provider: ELEVENLABS_PROVIDER,
        syncStatus: 'not_provisioned',
        externalAgentId: null,
        lastSyncedAt: null,
        lastError: null,
        remote: {
          checked: false,
          exists: null,
          name: null,
          rawStatus: null,
        },
      };
    }

    const base: AgentProviderStatusView = {
      provider: ELEVENLABS_PROVIDER,
      syncStatus: mapping.syncStatus,
      externalAgentId: mapping.externalAgentId,
      lastSyncedAt: mapping.lastSyncedAt,
      lastError: mapping.lastError,
      remote: {
        checked: false,
        exists: null,
        name: null,
        rawStatus: null,
      },
    };

    if (!mapping.externalAgentId || !this.voiceSync.isConfigured()) {
      return base;
    }

    try {
      const remote = await this.voiceSync.getStatus(mapping.externalAgentId);
      return {
        ...base,
        remote: {
          checked: true,
          exists: remote.exists,
          name: remote.name ?? null,
          rawStatus: remote.rawStatus ?? null,
        },
      };
    } catch (error) {
      const safe = this.sanitizeError(error);
      this.logger.warn(
        `Provider status check failed for agent ${agentId}: ${safe.message}`,
      );
      return {
        ...base,
        remote: {
          checked: true,
          exists: null,
          name: null,
          rawStatus: 'check_failed',
        },
      };
    }
  }

  /** Best-effort remote soft-disable on local archive (does not throw). */
  async bestEffortDeactivateRemote(agentId: string): Promise<void> {
    try {
      const mapping = await this.mappings.findOne({
        where: { agentId, provider: ELEVENLABS_PROVIDER },
      });
      if (!mapping?.externalAgentId || !this.voiceSync.isConfigured()) {
        return;
      }
      await this.voiceSync.deactivate(mapping.externalAgentId);
    } catch (error) {
      this.logger.warn(
        `Best-effort remote deactivate failed for agent ${agentId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  /** Best-effort remote delete before local hard delete (does not throw). */
  async bestEffortDeleteRemote(agentId: string): Promise<void> {
    try {
      const mapping = await this.mappings.findOne({
        where: { agentId, provider: ELEVENLABS_PROVIDER },
      });
      if (!mapping?.externalAgentId || !this.voiceSync.isConfigured()) {
        return;
      }
      await this.voiceSync.delete(mapping.externalAgentId);
    } catch (error) {
      this.logger.warn(
        `Best-effort remote delete failed for agent ${agentId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private toProviderInput(agent: AgentView): ProviderAgentCreateInput {
    return {
      name: agent.name,
      roleLabel: agent.roleLabel,
      personality: agent.personality,
      greeting: agent.greeting,
      instructions: agent.instructions,
      language: agent.language,
      languages: agent.languages,
      languageDetectionEnabled: agent.languageDetectionEnabled,
      languageSwitchingEnabled: agent.languageSwitchingEnabled,
      voicePreference: agent.voicePreference,
    };
  }

  private async beginPending(agentId: string): Promise<AgentProviderMapping> {
    return this.dataSource.transaction(async (manager) => {
      let mapping = await manager.findOne(AgentProviderMapping, {
        where: { agentId, provider: ELEVENLABS_PROVIDER },
        lock: { mode: 'pessimistic_write' },
      });

      if (!mapping) {
        mapping = manager.create(AgentProviderMapping, {
          agentId,
          provider: ELEVENLABS_PROVIDER,
          externalAgentId: null,
          syncStatus: 'not_provisioned',
          lastSyncedAt: null,
          lastError: null,
        });
      }

      if (
        mapping.syncStatus === 'pending' &&
        mapping.updatedAt &&
        Date.now() - mapping.updatedAt.getTime() < PENDING_STALE_MS
      ) {
        throw new ApplicationError(
          'PROVIDER_SYNC_IN_PROGRESS',
          'A sync is already in progress for this agent. Please wait and retry.',
          409,
        );
      }

      mapping.syncStatus = 'pending';
      mapping.lastError = null;
      return manager.save(mapping);
    });
  }

  private async markSynced(
    mappingId: string,
    externalAgentId: string,
  ): Promise<AgentProviderMapping> {
    const mapping = await this.mappings.findOneByOrFail({ id: mappingId });
    mapping.externalAgentId = externalAgentId;
    mapping.syncStatus = 'synced';
    mapping.lastSyncedAt = new Date();
    mapping.lastError = null;
    return this.mappings.save(mapping);
  }

  private async markError(
    mappingId: string,
    safeMessage: string,
  ): Promise<void> {
    await this.mappings.update(
      { id: mappingId },
      {
        syncStatus: 'error',
        lastError: safeMessage.slice(0, 1000),
      },
    );
  }

  private sanitizeError(error: unknown): {
    code: string;
    message: string;
    statusCode: number;
  } {
    if (error instanceof ApplicationError) {
      return {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      code: 'PROVIDER_SYNC_FAILED',
      message: 'Voice provider sync failed. Please retry or contact support.',
      statusCode: 502,
    };
  }
}

/** Helper for AgentsService.toView without circular import of sync types at runtime. */
export function mapProviderMappings(
  mappings: AgentProviderMapping[] | undefined,
): ProviderMappingView[] {
  if (!mappings?.length) {
    return [];
  }
  return mappings.map((m) => ({
    provider: m.provider,
    syncStatus: m.syncStatus,
    externalAgentId: m.externalAgentId,
    lastSyncedAt: m.lastSyncedAt,
    lastError: m.lastError,
  }));
}
