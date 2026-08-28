import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../infrastructure/object-storage/object-storage.port';
import {
  VOICE_CLONE_PORT,
  VOICE_CLONE_CONSENT_VERSION,
  type VoiceClonePort,
} from '../../providers/voice-clone.port';
import { VOICE_CATALOG_PORT, type VoiceCatalogPort } from '../../providers/voice-catalog.port';
import { AgentConfig } from '../agents/entities/agent-config.entity';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { VoiceAsset } from '../voices/entities/voice-asset.entity';
import { VoiceProviderMapping } from '../voices/entities/voice-provider-mapping.entity';
import { VoiceClone } from './entities/voice-clone.entity';
import { VoiceConsent } from './entities/voice-consent.entity';
import { VoiceSample } from './entities/voice-sample.entity';
import {
  ALLOWED_VOICE_CLONE_CONSENT_VERSIONS,
  type CreateVoiceCloneDto,
  type ListVoiceClonesQueryDto,
  type RecordVoiceCloneConsentDto,
} from './dto/voice-clones.dto';
import { assertVoiceCloneCan } from './voice-clone-permissions';

const ALLOWED_SAMPLE_MIME_PREFIXES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
];

export type VoiceCloneSummaryView = {
  id: string;
  displayName: string;
  description: string | null;
  status: VoiceClone['status'];
  voiceAssetId: string | null;
  sampleCount: number;
  assignedAgentCount: number;
  lastError: string | null;
  createdAt: Date;
  readyAt: Date | null;
};

export type VoiceCloneDetailView = VoiceCloneSummaryView & {
  provider: string;
  submittedAt: Date | null;
  revokedAt: Date | null;
  consentRecorded: boolean;
  consentAcceptedAt: Date | null;
  samples: {
    id: string;
    originalFilename: string;
    byteSize: number;
    contentType: string;
  }[];
  assignedAgents: { id: string; name: string }[];
};

export type VoiceCloneStatusView = {
  status: VoiceClone['status'];
  lastError: string | null;
  voiceAssetId: string | null;
};

@Injectable()
export class VoiceClonesService {
  private readonly logger = new Logger(VoiceClonesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    @Inject(VOICE_CLONE_PORT)
    private readonly cloneProvider: VoiceClonePort,
    @Inject(VOICE_CATALOG_PORT)
    private readonly catalog: VoiceCatalogPort,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly objectStorage: ObjectStoragePort,
    @InjectRepository(VoiceClone)
    private readonly clones: Repository<VoiceClone>,
    @InjectRepository(VoiceConsent)
    private readonly consents: Repository<VoiceConsent>,
    @InjectRepository(VoiceSample)
    private readonly samples: Repository<VoiceSample>,
    @InjectRepository(VoiceAsset)
    private readonly assets: Repository<VoiceAsset>,
    @InjectRepository(VoiceProviderMapping)
    private readonly mappings: Repository<VoiceProviderMapping>,
    @InjectRepository(AgentConfig)
    private readonly agentConfigs: Repository<AgentConfig>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  async listForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    query: ListVoiceClonesQueryDto = {},
  ): Promise<{
    clones: VoiceCloneSummaryView[];
    total: number;
    page: number;
    limit: number;
  }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'list_voice_clones');
    await this.requireActiveBusiness(organizationId, businessId);

    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.clones
      .createQueryBuilder('clone')
      .where('clone.businessId = :businessId', { businessId })
      .orderBy('clone.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('clone.status = :status', { status: query.status });
    }

    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const summaries = await Promise.all(
      rows.map((row) => this.toSummary(row, businessId)),
    );
    return { clones: summaries, total, page, limit };
  }

  async getForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
  ): Promise<VoiceCloneDetailView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'view_voice_clone');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    return this.toDetail(clone, businessId);
  }

  async getStatusForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
  ): Promise<VoiceCloneStatusView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'view_voice_clone');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    return {
      status: clone.status,
      lastError: clone.lastError,
      voiceAssetId: clone.voiceAssetId,
    };
  }

  async createDraftForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    input: CreateVoiceCloneDto,
  ): Promise<VoiceCloneDetailView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'create_voice_clone');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.clones.save(
      this.clones.create({
        businessId,
        displayName: input.displayName.trim(),
        description: input.description?.trim() || null,
        status: 'draft',
        provider: this.cloneProvider.providerName,
        createdByUserId: userId,
      }),
    );

    this.logger.log(
      `voice_clone.created cloneId=${clone.id} businessId=${businessId} userId=${userId}`,
    );
    return this.toDetail(clone, businessId);
  }

  async uploadSampleForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
    file: Express.Multer.File | undefined,
  ): Promise<{ sample: { id: string; originalFilename: string; byteSize: number; contentType: string } }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'manage_voice_clone_samples');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    this.assertEditableClone(clone);

    this.validateSampleFile(file);

    const enabled =
      this.config.get<boolean>('objectStorage.enabled') ?? false;
    if (!enabled) {
      throw new ApplicationError(
        'OBJECT_STORAGE_NOT_CONFIGURED',
        'Object storage is not configured. Voice sample uploads are unavailable.',
        503,
      );
    }

    const maxSamples =
      this.config.get<number>('voiceClones.maxSamples') ?? 5;
    const existingCount = await this.samples.count({
      where: { voiceCloneId: clone.id, status: 'uploaded' },
    });
    if (existingCount >= maxSamples) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLES_LIMIT',
        `You can upload up to ${maxSamples} samples per clone.`,
        400,
      );
    }

    const checksum = createHash('sha256').update(file!.buffer).digest('hex');
    const contentType = file!.mimetype || 'application/octet-stream';
    const sample = await this.samples.save(
      this.samples.create({
        voiceCloneId: clone.id,
        businessId,
        storageKey: 'pending',
        originalFilename: this.sanitizeFilename(
          file!.originalname || 'sample.bin',
        ),
        contentType,
        byteSize: String(file!.size),
        checksumSha256: checksum,
        status: 'uploaded',
      }),
    );

    const storageKey = `org/${organizationId}/biz/${businessId}/voice-samples/${clone.id}/${sample.id}/${sample.originalFilename}`;
    await this.objectStorage.putObject(storageKey, file!.buffer, contentType);
    sample.storageKey = storageKey;
    await this.samples.save(sample);

    this.logger.log(
      `voice_clone.sample_uploaded cloneId=${clone.id} sampleId=${sample.id}`,
    );

    return {
      sample: {
        id: sample.id,
        originalFilename: sample.originalFilename,
        byteSize: Number(sample.byteSize),
        contentType: sample.contentType,
      },
    };
  }

  async deleteSampleForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
    sampleId: string,
  ): Promise<void> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'manage_voice_clone_samples');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    this.assertEditableClone(clone);

    const sample = await this.samples.findOne({
      where: { id: sampleId, voiceCloneId: clone.id, status: 'uploaded' },
    });
    if (!sample) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLE_NOT_FOUND',
        'Voice sample was not found.',
        404,
      );
    }

    try {
      await this.objectStorage.deleteObject(sample.storageKey);
    } catch {
      this.logger.warn(
        `Failed to delete voice sample object ${sample.storageKey}`,
      );
    }

    sample.status = 'deleted';
    await this.samples.save(sample);
  }

  async recordConsentForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
    input: RecordVoiceCloneConsentDto,
    requestMeta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ consent: { id: string; acceptedAt: Date } }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'record_voice_clone_consent');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    this.assertEditableClone(clone);

    if (
      !ALLOWED_VOICE_CLONE_CONSENT_VERSIONS.includes(
        input.consentVersion as (typeof ALLOWED_VOICE_CLONE_CONSENT_VERSIONS)[number],
      )
    ) {
      throw new ApplicationError(
        'VOICE_CLONE_CONSENT_INVALID',
        'Unsupported consent version.',
        400,
      );
    }

    const consent = await this.consents.save(
      this.consents.create({
        voiceCloneId: clone.id,
        businessId,
        userId,
        consentVersion: input.consentVersion,
        consentTextHash: input.consentTextHash.trim(),
        acceptedAt: new Date(),
        ipAddress: requestMeta?.ipAddress ?? null,
        userAgent: requestMeta?.userAgent ?? null,
        metadata: {},
      }),
    );

    this.logger.log(
      `voice_clone.consent_recorded cloneId=${clone.id} consentId=${consent.id}`,
    );

    return { consent: { id: consent.id, acceptedAt: consent.acceptedAt } };
  }

  async submitForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
  ): Promise<VoiceCloneDetailView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'submit_voice_clone');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    if (clone.status !== 'draft' && clone.status !== 'failed') {
      throw new ApplicationError(
        'VOICE_CLONE_INVALID_STATE',
        'This clone cannot be submitted in its current state.',
        409,
      );
    }

    const consentCount = await this.consents.count({
      where: { voiceCloneId: clone.id },
    });
    if (consentCount === 0) {
      throw new ApplicationError(
        'VOICE_CLONE_CONSENT_REQUIRED',
        'Explicit consent is required before submitting a voice clone.',
        400,
      );
    }

    const sampleRows = await this.samples.find({
      where: { voiceCloneId: clone.id, status: 'uploaded' },
      order: { createdAt: 'ASC' },
    });
    if (sampleRows.length === 0) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLES_REQUIRED',
        'Upload at least one voice sample before submitting.',
        400,
      );
    }

    if (!this.cloneProvider.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'Voice cloning is not configured on the server.',
        503,
      );
    }

    clone.status = 'processing';
    clone.submittedAt = new Date();
    clone.lastError = null;
    await this.clones.save(clone);

    this.logger.log(`voice_clone.submitted cloneId=${clone.id}`);

    try {
      const sampleBuffers = await Promise.all(
        sampleRows.map(async (row) => ({
          buffer: await this.objectStorage.getObject(row.storageKey),
          filename: row.originalFilename,
          contentType: row.contentType,
        })),
      );

      const providerResult = await this.cloneProvider.createClone({
        displayName: clone.displayName,
        description: clone.description,
        samples: sampleBuffers,
      });

      let previewUrl: string | undefined;
      try {
        const providerVoice = await this.catalog.getVoice(
          providerResult.externalVoiceId,
        );
        const previewFromMeta = providerVoice?.metadata?.previewUrl;
        previewUrl =
          typeof previewFromMeta === 'string' ? previewFromMeta : undefined;
      } catch {
        /* preview URL optional */
      }

      await this.dataSource.transaction(async (manager) => {
        const asset = manager.create(VoiceAsset, {
          businessId,
          sourceType: 'business_clone',
          displayName: clone.displayName,
          description: clone.description,
          languageCodes: ['en'],
          genderPresentation: 'unknown',
          accent: null,
          styleLabels: [],
          previewSampleText:
            'Hello, thank you for calling. How may I help you today?',
          status: 'active',
        });
        const savedAsset = await manager.save(asset);

        const mapping = manager.create(VoiceProviderMapping, {
          voiceAssetId: savedAsset.id,
          provider: this.cloneProvider.providerName,
          externalVoiceId: providerResult.externalVoiceId,
          metadata: {
            ...(providerResult.metadata ?? {}),
            previewUrl,
            syncStatus: 'synced',
          },
        });
        await manager.save(mapping);

        clone.voiceAssetId = savedAsset.id;
        clone.status = 'ready';
        clone.readyAt = new Date();
        clone.lastError = null;
        await manager.save(VoiceClone, clone);
      });

      this.logger.log(
        `voice_clone.ready cloneId=${clone.id} voiceAssetId=${clone.voiceAssetId}`,
      );
    } catch (error) {
      clone.status = 'failed';
      clone.lastError =
        error instanceof ApplicationError
          ? error.message
          : 'Voice cloning failed. Please try again.';
      await this.clones.save(clone);
      this.logger.warn(
        `voice_clone.failed cloneId=${clone.id} reason=${clone.lastError}`,
      );
      throw error instanceof ApplicationError
        ? error
        : new ApplicationError(
            'VOICE_CLONE_PROVIDER_FAILED',
            clone.lastError,
            502,
          );
    }

    const refreshed = await this.findOwnedClone(businessId, cloneId);
    return this.toDetail(refreshed, businessId);
  }

  async retryForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
  ): Promise<VoiceCloneDetailView> {
    const clone = await this.findOwnedClone(businessId, cloneId);
    if (clone.status !== 'failed') {
      throw new ApplicationError(
        'VOICE_CLONE_INVALID_STATE',
        'Only failed clones can be retried.',
        409,
      );
    }
    clone.status = 'draft';
    clone.lastError = null;
    await this.clones.save(clone);
    return this.submitForUser(userId, organizationId, businessId, cloneId);
  }

  async revokeForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
  ): Promise<VoiceCloneDetailView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'revoke_voice_clone');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    if (clone.status !== 'ready') {
      throw new ApplicationError(
        'VOICE_CLONE_INVALID_STATE',
        'Only ready clones can be revoked.',
        409,
      );
    }

    if (clone.voiceAssetId) {
      const mapping = await this.mappings.findOne({
        where: {
          voiceAssetId: clone.voiceAssetId,
          provider: clone.provider,
        },
      });
      if (mapping?.externalVoiceId && this.cloneProvider.deleteClone) {
        await this.cloneProvider.deleteClone(mapping.externalVoiceId);
      }

      const asset = await this.assets.findOne({
        where: { id: clone.voiceAssetId },
      });
      if (asset) {
        asset.status = 'archived';
        await this.assets.save(asset);
      }
    }

    clone.status = 'revoked';
    clone.revokedAt = new Date();
    await this.clones.save(clone);

    this.logger.log(`voice_clone.revoked cloneId=${clone.id}`);
    return this.toDetail(clone, businessId);
  }

  async deleteForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    cloneId: string,
  ): Promise<void> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertVoiceCloneCan(membership.role, 'delete_voice_clone');
    await this.requireActiveBusiness(organizationId, businessId);

    const clone = await this.findOwnedClone(businessId, cloneId);
    if (clone.status === 'processing') {
      throw new ApplicationError(
        'VOICE_CLONE_INVALID_STATE',
        'Cannot delete a clone while it is processing.',
        409,
      );
    }

    if (clone.voiceAssetId) {
      const assignedAgents = await this.listAssignedAgents(
        clone.voiceAssetId,
        businessId,
      );
      if (assignedAgents.length > 0) {
        throw new ApplicationError(
          'VOICE_CLONE_IN_USE',
          'Unassign this voice from all agents before deleting the clone.',
          409,
          { assignedAgents },
        );
      }
    }

    const sampleRows = await this.samples.find({
      where: { voiceCloneId: clone.id, status: 'uploaded' },
    });
    for (const sample of sampleRows) {
      try {
        await this.objectStorage.deleteObject(sample.storageKey);
      } catch {
        this.logger.warn(`Failed to delete sample object ${sample.storageKey}`);
      }
    }

    if (clone.voiceAssetId) {
      const mapping = await this.mappings.findOne({
        where: {
          voiceAssetId: clone.voiceAssetId,
          provider: clone.provider,
        },
      });
      if (mapping?.externalVoiceId && this.cloneProvider.deleteClone) {
        await this.cloneProvider.deleteClone(mapping.externalVoiceId);
      }
      await this.mappings.delete({ voiceAssetId: clone.voiceAssetId });
      await this.assets.delete({ id: clone.voiceAssetId });
    }

    await this.clones.delete({ id: clone.id });
    this.logger.log(`voice_clone.deleted cloneId=${cloneId}`);
  }

  private async toSummary(
    clone: VoiceClone,
    businessId: string,
  ): Promise<VoiceCloneSummaryView> {
    const sampleCount = await this.samples.count({
      where: { voiceCloneId: clone.id, status: 'uploaded' },
    });
    const assignedAgentCount = clone.voiceAssetId
      ? (await this.listAssignedAgents(clone.voiceAssetId, businessId)).length
      : 0;

    return {
      id: clone.id,
      displayName: clone.displayName,
      description: clone.description,
      status: clone.status,
      voiceAssetId: clone.voiceAssetId,
      sampleCount,
      assignedAgentCount,
      lastError: clone.lastError,
      createdAt: clone.createdAt,
      readyAt: clone.readyAt,
    };
  }

  private async toDetail(
    clone: VoiceClone,
    businessId: string,
  ): Promise<VoiceCloneDetailView> {
    const summary = await this.toSummary(clone, businessId);
    const consents = await this.consents.find({
      where: { voiceCloneId: clone.id },
      order: { acceptedAt: 'DESC' },
      take: 1,
    });
    const consent = consents[0] ?? null;
    const sampleRows = await this.samples.find({
      where: { voiceCloneId: clone.id, status: 'uploaded' },
      order: { createdAt: 'ASC' },
    });
    const assignedAgents = clone.voiceAssetId
      ? await this.listAssignedAgents(clone.voiceAssetId, businessId)
      : [];

    return {
      ...summary,
      provider: clone.provider,
      submittedAt: clone.submittedAt,
      revokedAt: clone.revokedAt,
      consentRecorded: Boolean(consent),
      consentAcceptedAt: consent?.acceptedAt ?? null,
      samples: sampleRows.map((row) => ({
        id: row.id,
        originalFilename: row.originalFilename,
        byteSize: Number(row.byteSize),
        contentType: row.contentType,
      })),
      assignedAgents,
    };
  }

  private assertEditableClone(clone: VoiceClone): void {
    if (clone.status !== 'draft' && clone.status !== 'failed') {
      throw new ApplicationError(
        'VOICE_CLONE_INVALID_STATE',
        'Samples and consent can only be changed while the clone is a draft or failed.',
        409,
      );
    }
  }

  private validateSampleFile(file: Express.Multer.File | undefined): void {
    if (!file || !file.buffer?.length) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLE_INVALID',
        'A voice sample file is required.',
        400,
      );
    }

    const maxBytes =
      this.config.get<number>('voiceClones.maxSampleBytes') ??
      25 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLE_TOO_LARGE',
        `Each sample must be ${Math.floor(maxBytes / (1024 * 1024))}MB or smaller.`,
        400,
      );
    }

    const contentType = (file.mimetype || '').toLowerCase();
    const allowed = ALLOWED_SAMPLE_MIME_PREFIXES.some(
      (prefix) =>
        contentType === prefix || contentType.startsWith(`${prefix};`),
    );
    if (!allowed) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLE_INVALID',
        'Unsupported audio format. Upload MP3, WAV, M4A, WebM, or OGG.',
        400,
      );
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^\w.\-()+\s]/g, '_').slice(0, 200) || 'sample.bin';
  }

  private async findOwnedClone(
    businessId: string,
    cloneId: string,
  ): Promise<VoiceClone> {
    const clone = await this.clones.findOne({
      where: { id: cloneId, businessId },
    });
    if (!clone) {
      throw new ApplicationError(
        'VOICE_CLONE_NOT_FOUND',
        'Voice clone was not found.',
        404,
      );
    }
    return clone;
  }

  private async listAssignedAgents(
    voiceAssetId: string,
    businessId: string,
  ): Promise<{ id: string; name: string }[]> {
    const configs = await this.agentConfigs
      .createQueryBuilder('config')
      .innerJoinAndSelect('config.agent', 'agent')
      .where('config.voiceId = :voiceAssetId', { voiceAssetId })
      .andWhere('agent.businessId = :businessId', { businessId })
      .getMany();

    return configs.map((config) => ({
      id: config.agent.id,
      name: config.agent.name,
    }));
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
}

export { VOICE_CLONE_CONSENT_VERSION };
