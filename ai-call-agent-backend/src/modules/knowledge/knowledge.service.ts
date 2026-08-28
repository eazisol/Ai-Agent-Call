import { createHash } from 'node:crypto';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../infrastructure/object-storage/object-storage.port';
import { Agent } from '../agents/entities/agent.entity';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import type {
  CreateKnowledgeFaqDto,
  CreateKnowledgeTextDto,
  CreateKnowledgeUrlDto,
  UpdateKnowledgeDto,
} from './dto/knowledge.dto';
import { AgentKnowledgeSource } from './entities/agent-knowledge-source.entity';
import { KnowledgeProviderMapping } from './entities/knowledge-provider-mapping.entity';
import {
  KnowledgeSource,
  type KnowledgeFaqItem,
  type KnowledgeSourceStatus,
  type KnowledgeSourceType,
} from './entities/knowledge-source.entity';
import { assertKnowledgeCan } from './knowledge-permissions';
import {
  KnowledgeSyncService,
  mapProviderMappings,
  type KnowledgeProviderMappingView,
} from './knowledge-sync.service';

const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.md',
  '.docx',
  '.csv',
]);

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

export type KnowledgeSourceView = {
  id: string;
  businessId: string;
  organizationId: string;
  name: string;
  type: KnowledgeSourceType;
  status: KnowledgeSourceStatus;
  description: string | null;
  language: string | null;
  url: string | null;
  textBody: string | null;
  faqItems: KnowledgeFaqItem[] | null;
  originalFilename: string | null;
  contentType: string | null;
  byteSize: number | null;
  contentHash: string | null;
  version: number;
  assignedAgentCount: number;
  assignedAgents: { id: string; name: string }[];
  providerMappings: KnowledgeProviderMappingView[];
  needsSync: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentKnowledgeAssignmentView = {
  assignmentId: string;
  agentId: string;
  knowledge: KnowledgeSourceView;
  assignedAt: Date;
};

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => KnowledgeSyncService))
    private readonly knowledgeSync: KnowledgeSyncService,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly objectStorage: ObjectStoragePort,
    @InjectRepository(KnowledgeSource)
    private readonly sources: Repository<KnowledgeSource>,
    @InjectRepository(AgentKnowledgeSource)
    private readonly assignments: Repository<AgentKnowledgeSource>,
    @InjectRepository(KnowledgeProviderMapping)
    private readonly mappings: Repository<KnowledgeProviderMapping>,
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  async listForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    includeArchived = false,
  ): Promise<KnowledgeSourceView[]> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'list_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const qb = this.sources
      .createQueryBuilder('source')
      .leftJoinAndSelect('source.providerMappings', 'providerMappings')
      .leftJoinAndSelect('source.assignments', 'assignments')
      .leftJoinAndSelect('assignments.agent', 'assignedAgent')
      .where('source.businessId = :businessId', { businessId })
      .orderBy('source.createdAt', 'ASC');

    if (!includeArchived) {
      qb.andWhere('source.status <> :archived', { archived: 'archived' });
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.toView(row, organizationId));
  }

  async getForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<KnowledgeSourceView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'view_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });
    const source = await this.findOwnedSource(businessId, knowledgeId);
    return this.toView(source, organizationId);
  }

  async createUrl(
    userId: string,
    organizationId: string,
    businessId: string,
    input: CreateKnowledgeUrlDto,
  ): Promise<KnowledgeSourceView> {
    await this.assertCreate(userId, organizationId, businessId);
    const url = this.requireHttpUrl(input.url);
    const saved = await this.sources.save(
      this.sources.create({
        businessId,
        name: this.requireName(input.name),
        type: 'url',
        status: 'active',
        description: this.optionalText(input.description),
        language: this.optionalLanguage(input.language),
        url,
        textBody: null,
        faqItems: null,
        objectKey: null,
        originalFilename: null,
        contentType: null,
        byteSize: null,
        contentHash: this.hashString(url),
        version: 1,
      }),
    );
    this.logger.log(
      `Created URL knowledge ${saved.id} for business ${businessId} by user ${userId}`,
    );
    return this.getForUser(userId, organizationId, businessId, saved.id);
  }

  async createText(
    userId: string,
    organizationId: string,
    businessId: string,
    input: CreateKnowledgeTextDto,
  ): Promise<KnowledgeSourceView> {
    await this.assertCreate(userId, organizationId, businessId);
    const text = this.requireText(input.text);
    const saved = await this.sources.save(
      this.sources.create({
        businessId,
        name: this.requireName(input.name),
        type: 'text',
        status: 'active',
        description: this.optionalText(input.description),
        language: this.optionalLanguage(input.language),
        url: null,
        textBody: text,
        faqItems: null,
        objectKey: null,
        originalFilename: null,
        contentType: 'text/plain',
        byteSize: Buffer.byteLength(text, 'utf8'),
        contentHash: this.hashString(text),
        version: 1,
      }),
    );
    this.logger.log(
      `Created text knowledge ${saved.id} for business ${businessId} by user ${userId}`,
    );
    return this.getForUser(userId, organizationId, businessId, saved.id);
  }

  async createFaq(
    userId: string,
    organizationId: string,
    businessId: string,
    input: CreateKnowledgeFaqDto,
  ): Promise<KnowledgeSourceView> {
    await this.assertCreate(userId, organizationId, businessId);
    const items = this.requireFaqItems(input.items);
    const textMirror = this.renderFaqText(items);
    const saved = await this.sources.save(
      this.sources.create({
        businessId,
        name: this.requireName(input.name),
        type: 'faq',
        status: 'active',
        description: this.optionalText(input.description),
        language: this.optionalLanguage(input.language),
        url: null,
        textBody: textMirror,
        faqItems: items,
        objectKey: null,
        originalFilename: null,
        contentType: 'application/json',
        byteSize: Buffer.byteLength(textMirror, 'utf8'),
        contentHash: this.hashString(textMirror),
        version: 1,
      }),
    );
    this.logger.log(
      `Created FAQ knowledge ${saved.id} for business ${businessId} by user ${userId}`,
    );
    return this.getForUser(userId, organizationId, businessId, saved.id);
  }

  async createFile(
    userId: string,
    organizationId: string,
    businessId: string,
    file: Express.Multer.File | undefined,
    name: string | undefined,
    description?: string | null,
  ): Promise<KnowledgeSourceView> {
    await this.assertCreate(userId, organizationId, businessId);

    if (!file?.buffer?.length) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'A file is required for file knowledge sources.',
        400,
      );
    }

    this.validateFile(file);

    const enabled = this.config.get<boolean>('objectStorage.enabled') ?? false;
    if (!enabled) {
      throw new ApplicationError(
        'OBJECT_STORAGE_NOT_CONFIGURED',
        'Object storage is not configured. File uploads are unavailable.',
        503,
      );
    }

    const displayName = this.requireName(
      name?.trim() || file.originalname || 'Uploaded file',
    );
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');
    const contentType = file.mimetype || 'application/octet-stream';

    const saved = await this.dataSource.transaction(async (manager) => {
      const source = await manager.save(
        KnowledgeSource,
        manager.create(KnowledgeSource, {
          businessId,
          name: displayName,
          type: 'file',
          status: 'active',
          description: this.optionalText(description),
          language: null,
          url: null,
          textBody: null,
          faqItems: null,
          objectKey: null,
          originalFilename: file.originalname?.slice(0, 255) ?? null,
          contentType,
          byteSize: file.size,
          contentHash,
          version: 1,
        }),
      );

      const objectKey = `org/${organizationId}/biz/${businessId}/knowledge/${source.id}/${this.sanitizeFilename(file.originalname || 'file')}`;
      await this.objectStorage.putObject(objectKey, file.buffer, contentType);
      source.objectKey = objectKey;
      return manager.save(KnowledgeSource, source);
    });

    this.logger.log(
      `Created file knowledge ${saved.id} for business ${businessId} by user ${userId}`,
    );
    return this.getForUser(userId, organizationId, businessId, saved.id);
  }

  async updateForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
    input: UpdateKnowledgeDto,
  ): Promise<KnowledgeSourceView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'update_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const keys = Object.entries(input).filter(([, value]) => value !== undefined);
    if (keys.length === 0) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'No knowledge fields provided to update.',
        400,
      );
    }

    const source = await this.findOwnedSource(businessId, knowledgeId);
    let contentChanged = false;

    if (input.name !== undefined) {
      source.name = this.requireName(input.name);
    }
    if (input.description !== undefined) {
      source.description = this.optionalText(input.description);
    }
    if (input.language !== undefined) {
      source.language = this.optionalLanguage(input.language);
    }

    if (input.url !== undefined) {
      if (source.type !== 'url') {
        throw new ApplicationError(
          'KNOWLEDGE_TYPE_INVALID',
          'URL can only be updated on URL knowledge sources.',
          400,
        );
      }
      source.url = this.requireHttpUrl(input.url);
      source.contentHash = this.hashString(source.url);
      contentChanged = true;
    }

    if (input.text !== undefined) {
      if (source.type !== 'text') {
        throw new ApplicationError(
          'KNOWLEDGE_TYPE_INVALID',
          'Text can only be updated on text knowledge sources.',
          400,
        );
      }
      source.textBody = this.requireText(input.text);
      source.byteSize = Buffer.byteLength(source.textBody, 'utf8');
      source.contentHash = this.hashString(source.textBody);
      contentChanged = true;
    }

    if (input.items !== undefined) {
      if (source.type !== 'faq') {
        throw new ApplicationError(
          'KNOWLEDGE_TYPE_INVALID',
          'FAQ items can only be updated on FAQ knowledge sources.',
          400,
        );
      }
      const items = this.requireFaqItems(input.items);
      const textMirror = this.renderFaqText(items);
      source.faqItems = items;
      source.textBody = textMirror;
      source.byteSize = Buffer.byteLength(textMirror, 'utf8');
      source.contentHash = this.hashString(textMirror);
      contentChanged = true;
    }

    if (contentChanged) {
      source.version = (source.version ?? 1) + 1;
    }

    await this.sources.save(source);
    return this.getForUser(userId, organizationId, businessId, knowledgeId);
  }

  async archiveForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<KnowledgeSourceView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'archive_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const source = await this.findOwnedSource(businessId, knowledgeId);
    source.status = 'archived';
    await this.sources.save(source);
    return this.getForUser(userId, organizationId, businessId, knowledgeId);
  }

  async deleteForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    knowledgeId: string,
  ): Promise<{ deleted: true }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'delete_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const source = await this.findOwnedSource(businessId, knowledgeId);
    const assignmentCount = await this.assignments.count({
      where: { knowledgeSourceId: source.id },
    });
    if (assignmentCount > 0) {
      throw new ApplicationError(
        'KNOWLEDGE_HAS_ASSIGNMENTS',
        'Unassign this knowledge from all agents before deleting.',
        409,
        { assignedAgentCount: assignmentCount },
      );
    }

    await this.knowledgeSync.bestEffortRemoveRemote(source.id);

    if (source.objectKey) {
      await this.objectStorage.deleteObject(source.objectKey);
    }

    await this.sources.delete({ id: source.id });
    this.logger.log(
      `Deleted knowledge ${source.id} for business ${businessId} by user ${userId}`,
    );
    return { deleted: true };
  }

  async listAgentKnowledge(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
  ): Promise<AgentKnowledgeAssignmentView[]> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'list_agent_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });
    await this.findOwnedAgent(businessId, agentId);

    const rows = await this.assignments
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.knowledgeSource', 'source')
      .leftJoinAndSelect('source.providerMappings', 'providerMappings')
      .leftJoinAndSelect('source.assignments', 'assignments')
      .leftJoinAndSelect('assignments.agent', 'assignedAgent')
      .where('assignment.agentId = :agentId', { agentId })
      .andWhere('source.status <> :archived', { archived: 'archived' })
      .orderBy('assignment.createdAt', 'ASC')
      .getMany();

    return rows.map((row) => ({
      assignmentId: row.id,
      agentId: row.agentId,
      knowledge: this.toView(row.knowledgeSource, organizationId),
      assignedAt: row.createdAt,
    }));
  }

  async assignToAgent(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
    knowledgeId: string,
  ): Promise<AgentKnowledgeAssignmentView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'assign_knowledge');
    await this.requireActiveBusiness(organizationId, businessId);

    const agent = await this.findOwnedAgent(businessId, agentId);
    const source = await this.findOwnedSource(businessId, knowledgeId);

    if (source.businessId !== agent.businessId) {
      throw new ApplicationError(
        'KNOWLEDGE_CROSS_BUSINESS',
        'Knowledge can only be assigned to agents in the same business.',
        403,
      );
    }

    if (source.status === 'archived') {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'Archived knowledge cannot be assigned to agents.',
        400,
      );
    }

    try {
      const assignment = await this.assignments.save(
        this.assignments.create({
          agentId: agent.id,
          knowledgeSourceId: source.id,
        }),
      );

      const knowledge = await this.getForUser(
        userId,
        organizationId,
        businessId,
        source.id,
      );

      return {
        assignmentId: assignment.id,
        agentId: agent.id,
        knowledge,
        assignedAt: assignment.createdAt,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        String((error as QueryFailedError & { code?: string }).code) === '23505'
      ) {
        throw new ApplicationError(
          'KNOWLEDGE_ASSIGNMENT_CONFLICT',
          'This knowledge source is already assigned to the agent.',
          409,
        );
      }
      throw error;
    }
  }

  async unassignFromAgent(
    userId: string,
    organizationId: string,
    businessId: string,
    agentId: string,
    knowledgeId: string,
  ): Promise<{ deleted: true }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'assign_knowledge');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    await this.findOwnedAgent(businessId, agentId);
    await this.findOwnedSource(businessId, knowledgeId);

    const result = await this.assignments.delete({
      agentId,
      knowledgeSourceId: knowledgeId,
    });

    if (!result.affected) {
      throw new ApplicationError(
        'KNOWLEDGE_NOT_FOUND',
        'Knowledge assignment not found.',
        404,
      );
    }

    return { deleted: true };
  }

  private async assertCreate(
    userId: string,
    organizationId: string,
    businessId: string,
  ): Promise<void> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertKnowledgeCan(membership.role, 'create_knowledge');
    await this.requireActiveBusiness(organizationId, businessId);
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
        'Select an active business before managing knowledge.',
        400,
      );
    }
    if (!options.allowArchivedBusiness && business.status === 'archived') {
      throw new ApplicationError(
        'BUSINESS_ARCHIVED',
        'Archived businesses cannot manage knowledge. Reactivate the business first.',
        400,
      );
    }
    return business;
  }

  private async findOwnedSource(
    businessId: string,
    knowledgeId: string,
  ): Promise<KnowledgeSource> {
    const source = await this.sources.findOne({
      where: { id: knowledgeId, businessId },
      relations: { providerMappings: true, assignments: { agent: true } },
    });
    if (!source) {
      throw new ApplicationError(
        'KNOWLEDGE_NOT_FOUND',
        'Knowledge source not found.',
        404,
      );
    }
    return source;
  }

  private async findOwnedAgent(
    businessId: string,
    agentId: string,
  ): Promise<Agent> {
    const agent = await this.agents.findOne({
      where: { id: agentId, businessId },
    });
    if (!agent) {
      throw new ApplicationError('AGENT_NOT_FOUND', 'Agent not found.', 404);
    }
    return agent;
  }

  private toView(
    source: KnowledgeSource,
    organizationId: string,
  ): KnowledgeSourceView {
    const mappings = mapProviderMappings(source.providerMappings);
    const primary = mappings[0];
    const needsSync =
      !primary ||
      primary.syncStatus === 'not_provisioned' ||
      primary.syncStatus === 'error' ||
      (primary.lastSyncedVersion != null &&
        primary.lastSyncedVersion < source.version);

    const assignedAgents = (source.assignments ?? [])
      .map((row) =>
        row.agent
          ? { id: row.agent.id, name: row.agent.name }
          : null,
      )
      .filter((row): row is { id: string; name: string } => row != null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: source.id,
      businessId: source.businessId,
      organizationId,
      name: source.name,
      type: source.type,
      status: source.status,
      description: source.description,
      language: source.language,
      url: source.url,
      textBody: source.type === 'text' || source.type === 'faq' ? source.textBody : null,
      faqItems: source.type === 'faq' ? source.faqItems : null,
      originalFilename: source.originalFilename,
      contentType: source.contentType,
      byteSize: source.byteSize,
      contentHash: source.contentHash,
      version: source.version,
      assignedAgentCount: source.assignments?.length ?? 0,
      assignedAgents,
      providerMappings: mappings,
      needsSync,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }

  private requireName(name: string): string {
    const trimmed = name?.trim() ?? '';
    if (!trimmed) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'Knowledge name is required.',
        400,
      );
    }
    return trimmed.slice(0, 200);
  }

  private requireText(text: string): string {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'Text body is required.',
        400,
      );
    }
    return trimmed.slice(0, 500_000);
  }

  private requireHttpUrl(url: string): string {
    const trimmed = url?.trim() ?? '';
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new ApplicationError(
        'KNOWLEDGE_URL_INVALID',
        'URL must be a valid http(s) address.',
        400,
      );
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ApplicationError(
        'KNOWLEDGE_URL_INVALID',
        'URL must use http or https.',
        400,
      );
    }
    return trimmed.slice(0, 2048);
  }

  private requireFaqItems(
    items: Array<{ question: string; answer: string }> | undefined,
  ): KnowledgeFaqItem[] {
    if (!items?.length) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'At least one FAQ item is required.',
        400,
      );
    }
    const cleaned = items
      .map((item) => ({
        question: String(item.question ?? '').trim().slice(0, 2000),
        answer: String(item.answer ?? '').trim().slice(0, 20_000),
      }))
      .filter((item) => item.question && item.answer);
    if (!cleaned.length) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'At least one FAQ item is required.',
        400,
      );
    }
    return cleaned;
  }

  private renderFaqText(items: KnowledgeFaqItem[]): string {
    return items
      .map(
        (item, index) =>
          `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`,
      )
      .join('\n\n');
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 4000) : null;
  }

  private optionalLanguage(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 20) : null;
  }

  private hashString(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private validateFile(file: Express.Multer.File): void {
    const maxBytes =
      this.config.get<number>('knowledge.maxFileBytes') ??
      DEFAULT_MAX_FILE_BYTES;
    if (file.size > maxBytes) {
      throw new ApplicationError(
        'KNOWLEDGE_FILE_TOO_LARGE',
        `File exceeds the maximum size of ${maxBytes} bytes.`,
        400,
      );
    }

    const filename = (file.originalname || '').toLowerCase();
    const ext = filename.includes('.')
      ? `.${filename.split('.').pop()}`
      : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'Allowed file types: pdf, txt, md, docx, csv.',
        400,
      );
    }

    if (
      file.mimetype &&
      !ALLOWED_CONTENT_TYPES.has(file.mimetype) &&
      !file.mimetype.startsWith('text/')
    ) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'File content type is not allowed.',
        400,
      );
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180) || 'file';
  }
}

