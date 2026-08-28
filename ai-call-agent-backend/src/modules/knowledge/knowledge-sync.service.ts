import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../infrastructure/object-storage/object-storage.port';
import {
  KNOWLEDGE_SYNC_PORT,
  type KnowledgePublishInput,
  type KnowledgeSyncPort,
} from '../../providers/knowledge-sync.port';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  KnowledgeProviderMapping,
  type KnowledgeProviderSyncStatus,
} from './entities/knowledge-provider-mapping.entity';
import { KnowledgeSource } from './entities/knowledge-source.entity';
import { assertKnowledgeCan } from './knowledge-permissions';
import {
  KnowledgeService,
  type KnowledgeSourceView,
} from './knowledge.service';

export const ELEVENLABS_KNOWLEDGE_PROVIDER = 'elevenlabs';

/** Ignore concurrent sync if pending older than this (ms). */
const PENDING_STALE_MS = 60_000;

export type KnowledgeProviderMappingView = {
  provider: string;
  syncStatus: KnowledgeProviderSyncStatus;
  externalSourceId: string | null;
  lastSyncedAt: Date | null;
  lastSyncedVersion: number | null;
  lastError: string | null;
};

export type KnowledgeSyncResultView = {
  provider: string;
  syncStatus: KnowledgeProviderSyncStatus;
  externalSourceId: string | null;
  lastSyncedAt: Date | null;
  lastSyncedVersion: number | null;
  lastError: string | null;
  warnings: string[];
};

export type KnowledgeProviderStatusView = {
  provider: string;
  syncStatus: KnowledgeProviderSyncStatus;
  externalSourceId: string | null;
  lastSyncedAt: Date | null;
  lastSyncedVersion: number | null;
  lastError: string | null;
  remote: {
    checked: boolean;
    exists: boolean | null;
    name: string | null;
    rawStatus: string | null;
  };
};

@Injectable()
export class KnowledgeSyncService {
  private readonly logger = new Logger(KnowledgeSyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    @Inject(KNOWLEDGE_SYNC_PORT)
    private readonly knowledgeSync: KnowledgeSyncPort,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly objectStorage: ObjectStoragePort,
    @Inject(forwardRef(() => KnowledgeService))
    private readonly knowledge: KnowledgeService,
    @InjectRepository(KnowledgeProviderMapping)
    private readonly mappings: Repository<KnowledgeProviderMapping>,
    @InjectRepository(KnowledgeSource)
    private readonly sources: Repository<KnowledgeSource>,
  ) {}

  async syncForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<{
    knowledge: KnowledgeSourceView;
    sync: KnowledgeSyncResultView;
  }> {
    return this.runSync(userId, organizationId, businessId, knowledgeId);
  }

  async resyncForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<{
    knowledge: KnowledgeSourceView;
    sync: KnowledgeSyncResultView;
  }> {
    return this.runSync(userId, organizationId, businessId, knowledgeId);
  }

  async getStatusForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<KnowledgeProviderStatusView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'view_knowledge');

    await this.knowledge.getForUser(
      userId,
      organizationId,
      businessId,
      knowledgeId,
    );

    const mapping = await this.mappings.findOne({
      where: {
        knowledgeSourceId: knowledgeId,
        provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
      },
    });

    if (!mapping) {
      return {
        provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
        syncStatus: 'not_provisioned',
        externalSourceId: null,
        lastSyncedAt: null,
        lastSyncedVersion: null,
        lastError: null,
        remote: {
          checked: false,
          exists: null,
          name: null,
          rawStatus: null,
        },
      };
    }

    const base: KnowledgeProviderStatusView = {
      provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
      syncStatus: mapping.syncStatus,
      externalSourceId: mapping.externalSourceId,
      lastSyncedAt: mapping.lastSyncedAt,
      lastSyncedVersion: mapping.lastSyncedVersion,
      lastError: mapping.lastError,
      remote: {
        checked: false,
        exists: null,
        name: null,
        rawStatus: null,
      },
    };

    if (!mapping.externalSourceId || !this.knowledgeSync.isConfigured()) {
      return base;
    }

    try {
      const remote = await this.knowledgeSync.getStatus(
        mapping.externalSourceId,
      );
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
        `Provider status check failed for knowledge ${knowledgeId}: ${safe.message}`,
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

  async bestEffortRemoveRemote(knowledgeSourceId: string): Promise<void> {
    try {
      const mapping = await this.mappings.findOne({
        where: {
          knowledgeSourceId,
          provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
        },
      });
      if (!mapping?.externalSourceId || !this.knowledgeSync.isConfigured()) {
        return;
      }
      await this.knowledgeSync.remove(mapping.externalSourceId);
    } catch (error) {
      this.logger.warn(
        `Best-effort remote knowledge delete failed for ${knowledgeSourceId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private async runSync(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<{
    knowledge: KnowledgeSourceView;
    sync: KnowledgeSyncResultView;
  }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'update_knowledge');

    const knowledgeView = await this.knowledge.getForUser(
      userId,
      organizationId,
      businessId,
      knowledgeId,
    );

    if (knowledgeView.status === 'archived') {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'Archived knowledge cannot be synced.',
        400,
      );
    }

    if (!this.knowledgeSync.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'ElevenLabs is not configured on the server.',
        503,
      );
    }

    const source = await this.sources.findOneByOrFail({ id: knowledgeId });
    const input = await this.toPublishInput(source);
    let mapping = await this.beginPending(knowledgeId);

    try {
      // First sync → publish. Resync / existing external id → update
      // (adapter may delete+recreate when provider has no update API).
      const result = mapping.externalSourceId
        ? await this.knowledgeSync.update(mapping.externalSourceId, input)
        : await this.knowledgeSync.publish(input);

      mapping = await this.markSynced(
        mapping.id,
        result.externalSourceId,
        source.version,
      );

      this.logger.log(
        `Synced knowledge ${knowledgeId} → ${this.knowledgeSync.providerName}:${result.externalSourceId}`,
      );

      const refreshed = await this.knowledge.getForUser(
        userId,
        organizationId,
        businessId,
        knowledgeId,
      );

      return {
        knowledge: refreshed,
        sync: {
          provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
          syncStatus: mapping.syncStatus,
          externalSourceId: mapping.externalSourceId,
          lastSyncedAt: mapping.lastSyncedAt,
          lastSyncedVersion: mapping.lastSyncedVersion,
          lastError: mapping.lastError,
          warnings: result.warnings,
        },
      };
    } catch (error) {
      const safe = this.sanitizeError(error);
      await this.markError(mapping.id, safe.message);
      this.logger.warn(
        `Provider knowledge sync failed for ${knowledgeId}: ${safe.code} — ${safe.message}`,
      );
      throw new ApplicationError(safe.code, safe.message, safe.statusCode);
    }
  }

  private async toPublishInput(
    source: KnowledgeSource,
  ): Promise<KnowledgePublishInput> {
    let fileBytes: Buffer | null = null;
    if (source.type === 'file' && source.objectKey) {
      try {
        fileBytes = await this.objectStorage.getObject(source.objectKey);
      } catch (error) {
        this.logger.warn(
          `Could not load file bytes for knowledge ${source.id}; falling back to text if available: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    return {
      name: source.name,
      type: source.type,
      url: source.url,
      textBody: source.textBody,
      faqItems: source.faqItems,
      fileBytes,
      originalFilename: source.originalFilename,
      contentType: source.contentType,
    };
  }

  private async beginPending(
    knowledgeSourceId: string,
  ): Promise<KnowledgeProviderMapping> {
    return this.dataSource.transaction(async (manager) => {
      let mapping = await manager.findOne(KnowledgeProviderMapping, {
        where: {
          knowledgeSourceId,
          provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!mapping) {
        mapping = manager.create(KnowledgeProviderMapping, {
          knowledgeSourceId,
          provider: ELEVENLABS_KNOWLEDGE_PROVIDER,
          externalSourceId: null,
          syncStatus: 'not_provisioned',
          lastSyncedAt: null,
          lastSyncedVersion: null,
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
          'A sync is already in progress for this knowledge source. Please wait and retry.',
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
    externalSourceId: string,
    version: number,
  ): Promise<KnowledgeProviderMapping> {
    const mapping = await this.mappings.findOneByOrFail({ id: mappingId });
    mapping.externalSourceId = externalSourceId;
    mapping.syncStatus = 'synced';
    mapping.lastSyncedAt = new Date();
    mapping.lastSyncedVersion = version;
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
      message:
        'Knowledge provider sync failed. Please retry or contact support.',
      statusCode: 502,
    };
  }
}

export function mapProviderMappings(
  mappings: KnowledgeProviderMapping[] | undefined,
): KnowledgeProviderMappingView[] {
  if (!mappings?.length) {
    return [];
  }
  return mappings.map((m) => ({
    provider: m.provider,
    syncStatus: m.syncStatus,
    externalSourceId: m.externalSourceId,
    lastSyncedAt: m.lastSyncedAt,
    lastSyncedVersion: m.lastSyncedVersion,
    lastError: m.lastError,
  }));
}
