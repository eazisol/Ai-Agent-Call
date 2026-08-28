import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  TELEPHONY_PROVIDER_PORT,
  type TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import { Agent } from '../agents/entities/agent.entity';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { TelephonyMappingsService } from '../twilio/telephony-mappings.service';
import type {
  AssignPhoneNumberDto,
  ImportPhoneNumberDto,
  PurchasePhoneNumberDto,
  ReleasePhoneNumberDto,
  SearchPhoneNumbersDto,
} from './dto/phone-numbers.dto';
import { PhoneNumberAssignment } from './entities/phone-number-assignment.entity';
import {
  PhoneNumber,
  type PhoneNumberCapabilities,
  type PhoneNumberStatus,
} from './entities/phone-number.entity';
import {
  assertPhoneNumberCan,
  canViewProviderNumberId,
} from './phone-number-permissions';

const ACTIVE_INVENTORY_STATUSES: PhoneNumberStatus[] = [
  'provisioning',
  'active',
  'release_pending',
];

export type PhoneNumberAssignmentView = {
  id: string;
  agentId: string;
  agentName: string;
  status: 'active' | 'ended';
  assignedAt: Date;
};

export type PhoneNumberView = {
  id: string;
  phoneNumberE164: string;
  country: string;
  provider: string;
  status: PhoneNumberStatus;
  capabilities: PhoneNumberCapabilities;
  friendlyName: string | null;
  assignment: PhoneNumberAssignmentView | null;
  providerNumberId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PhoneNumberListResult = {
  items: PhoneNumberView[];
  page: number;
  limit: number;
  total: number;
};

export type PhoneNumberSearchCandidateView = {
  phoneNumber: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  isoCountry: string;
  capabilities: PhoneNumberCapabilities;
};

@Injectable()
export class PhoneNumbersService {
  private readonly logger = new Logger(PhoneNumbersService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    private readonly telephonyMappings: TelephonyMappingsService,
    @Inject(TELEPHONY_PROVIDER_PORT)
    private readonly telephony: TelephonyProviderPort,
    @InjectRepository(PhoneNumber)
    private readonly phoneNumbers: Repository<PhoneNumber>,
    @InjectRepository(PhoneNumberAssignment)
    private readonly assignments: Repository<PhoneNumberAssignment>,
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
  ) {}

  async listForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    options: {
      status?: PhoneNumberStatus;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PhoneNumberListResult> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'list_phone_numbers');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

    const qb = this.phoneNumbers
      .createQueryBuilder('phoneNumber')
      .leftJoinAndSelect(
        'phoneNumber.assignments',
        'assignment',
        "assignment.status = 'active'",
      )
      .leftJoinAndSelect('assignment.agent', 'agent')
      .where('phoneNumber.businessId = :businessId', { businessId })
      .orderBy('phoneNumber.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (options.status) {
      qb.andWhere('phoneNumber.status = :status', { status: options.status });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((row) =>
        this.toView(row, membership.role, row.assignments?.[0] ?? null),
      ),
      page,
      limit,
      total,
    };
  }

  async getForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    phoneNumberId: string,
  ): Promise<PhoneNumberView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'view_phone_number');
    await this.requireActiveBusiness(organizationId, businessId, {
      allowArchivedBusiness: true,
    });

    const phoneNumber = await this.findOwnedPhoneNumber(businessId, phoneNumberId);
    const activeAssignment = await this.assignments.findOne({
      where: { phoneNumberId, status: 'active' },
      relations: { agent: true },
    });
    return this.toView(phoneNumber, membership.role, activeAssignment);
  }

  async searchForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    input: SearchPhoneNumbersDto,
  ): Promise<{ candidates: PhoneNumberSearchCandidateView[] }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'search_phone_numbers');
    await this.requireActiveBusiness(organizationId, businessId);

    if (!this.telephony.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'Telephony is not configured on the server.',
        503,
      );
    }

    const candidates = await this.telephony.searchAvailableNumbers({
      isoCountry: input.isoCountry.trim().toUpperCase(),
      areaCode: input.areaCode?.trim(),
      contains: input.contains?.trim(),
      limit: input.limit,
    });

    return {
      candidates: candidates.map((candidate) => ({
        phoneNumber: candidate.phoneNumber,
        friendlyName: candidate.friendlyName,
        locality: candidate.locality,
        region: candidate.region,
        isoCountry: candidate.isoCountry,
        capabilities: candidate.capabilities,
      })),
    };
  }

  async purchaseForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    input: PurchasePhoneNumberDto,
  ): Promise<{ phoneNumber: PhoneNumberView }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'purchase_phone_number');
    await this.requireActiveBusiness(organizationId, businessId);

    if (!input.confirm) {
      throw new ApplicationError(
        'CONFIRMATION_REQUIRED',
        'Set confirm to true before purchasing a phone number.',
        400,
      );
    }

    if (!this.telephony.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'Telephony is not configured on the server.',
        503,
      );
    }

    const e164 = normalizeE164(input.phoneNumber);
    await this.assertNoActiveDuplicate(businessId, e164);

    const provisioning = await this.phoneNumbers.save(
      this.phoneNumbers.create({
        businessId,
        provider: this.telephony.providerName,
        phoneNumberE164: e164,
        country: deriveCountryFromE164(e164),
        status: 'provisioning',
        friendlyName: input.friendlyName?.trim().slice(0, 64) ?? null,
        capabilities: defaultCapabilities(),
      }),
    );

    try {
      const purchased = await this.telephony.purchaseNumber({
        phoneNumber: e164,
        friendlyName: input.friendlyName,
      });

      provisioning.providerNumberId = purchased.externalNumberId;
      provisioning.phoneNumberE164 = normalizeE164(purchased.phoneNumber);
      provisioning.country = deriveCountryFromE164(provisioning.phoneNumberE164);
      provisioning.status = 'active';
      provisioning.capabilities = defaultCapabilities();
      const saved = await this.phoneNumbers.save(provisioning);

      this.logger.log(
        `Purchased phone number ${saved.id} (${saved.phoneNumberE164}) for business ${businessId}`,
      );
      return { phoneNumber: this.toView(saved, membership.role, null) };
    } catch (error) {
      provisioning.status = 'failed';
      await this.phoneNumbers.save(provisioning).catch(() => undefined);
      throw error;
    }
  }

  async importForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    input: ImportPhoneNumberDto,
  ): Promise<{ phoneNumber: PhoneNumberView }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'import_phone_number');
    await this.requireActiveBusiness(organizationId, businessId);

    if (!this.telephony.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'Telephony is not configured on the server.',
        503,
      );
    }

    const e164 = normalizeE164(input.phoneNumber);
    await this.assertNoActiveDuplicate(businessId, e164);

    const located = await this.telephony.lookupProvisionedNumber(e164);
    await this.assertNoActiveDuplicate(
      businessId,
      normalizeE164(located.phoneNumber),
      this.telephony.providerName,
      located.externalNumberId,
    );

    const urls = this.telephony.defaultWebhookUrls();
    await this.telephony.configureNumber({
      externalNumberId: located.externalNumberId,
      voiceWebhookUrl: urls.voiceWebhookUrl,
      statusCallbackUrl: urls.statusCallbackUrl,
    });

    await this.telephonyMappings.recordActiveMapping({
      provider: this.telephony.providerName,
      externalResourceId: located.externalNumberId,
      phoneNumber: located.phoneNumber,
      metadata: {
        friendlyName: input.friendlyName ?? null,
        imported: true,
      },
    });

    const saved = await this.phoneNumbers.save(
      this.phoneNumbers.create({
        businessId,
        provider: this.telephony.providerName,
        providerNumberId: located.externalNumberId,
        phoneNumberE164: normalizeE164(located.phoneNumber),
        country: deriveCountryFromE164(located.phoneNumber),
        status: 'active',
        friendlyName: input.friendlyName?.trim().slice(0, 64) ?? null,
        capabilities: defaultCapabilities(),
        metadata: { imported: true },
      }),
    );

    this.logger.log(
      `Imported phone number ${saved.id} (${saved.phoneNumberE164}) for business ${businessId}`,
    );
    return { phoneNumber: this.toView(saved, membership.role, null) };
  }

  async assignForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    phoneNumberId: string,
    input: AssignPhoneNumberDto,
  ): Promise<{
    phoneNumberId: string;
    assignment: PhoneNumberAssignmentView;
  }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'assign_phone_number');
    await this.requireActiveBusiness(organizationId, businessId);

    const phoneNumber = await this.findOwnedPhoneNumber(businessId, phoneNumberId);
    if (phoneNumber.status !== 'active') {
      throw new ApplicationError(
        'PHONE_NUMBER_NOT_ASSIGNABLE',
        'Only active phone numbers can be assigned to an agent.',
        409,
      );
    }

    const agent = await this.agents.findOne({
      where: { id: input.agentId, businessId },
    });
    if (!agent) {
      throw new ApplicationError('AGENT_NOT_FOUND', 'Agent not found.', 404);
    }
    if (agent.businessId !== phoneNumber.businessId) {
      throw new ApplicationError(
        'PHONE_ASSIGNMENT_CROSS_BUSINESS',
        'This agent does not belong to the same business as the phone number.',
        403,
      );
    }
    if (agent.status === 'archived') {
      throw new ApplicationError(
        'PHONE_ASSIGNMENT_AGENT_INACTIVE',
        'Archived agents cannot receive phone number assignments.',
        409,
      );
    }
    if (agent.status === 'inactive') {
      throw new ApplicationError(
        'PHONE_ASSIGNMENT_AGENT_INACTIVE',
        'Inactive agents cannot receive phone number assignments.',
        409,
      );
    }

    const assignment = await this.dataSource.transaction(async (manager) => {
      await manager.update(
        PhoneNumberAssignment,
        { phoneNumberId, status: 'active' },
        { status: 'ended', unassignedAt: new Date() },
      );

      return manager.save(
        PhoneNumberAssignment,
        manager.create(PhoneNumberAssignment, {
          phoneNumberId,
          agentId: agent.id,
          status: 'active',
          assignedByUserId: userId,
          assignedAt: new Date(),
        }),
      );
    });

    return {
      phoneNumberId,
      assignment: {
        id: assignment.id,
        agentId: agent.id,
        agentName: agent.name,
        status: 'active',
        assignedAt: assignment.assignedAt,
      },
    };
  }

  async unassignForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    phoneNumberId: string,
  ): Promise<{ phoneNumberId: string; assignment: null }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'unassign_phone_number');
    await this.requireActiveBusiness(organizationId, businessId);
    await this.findOwnedPhoneNumber(businessId, phoneNumberId);

    await this.assignments.update(
      { phoneNumberId, status: 'active' },
      { status: 'ended', unassignedAt: new Date() },
    );

    return { phoneNumberId, assignment: null };
  }

  async releaseForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    phoneNumberId: string,
    input: ReleasePhoneNumberDto,
  ): Promise<{ phoneNumberId: string; status: PhoneNumberStatus; releasedAt: Date }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPhoneNumberCan(membership.role, 'release_phone_number');
    await this.requireActiveBusiness(organizationId, businessId);

    if (!input.confirm) {
      throw new ApplicationError(
        'CONFIRMATION_REQUIRED',
        'Set confirm to true before releasing a phone number.',
        400,
      );
    }

    const phoneNumber = await this.findOwnedPhoneNumber(businessId, phoneNumberId);
    if (phoneNumber.status === 'released') {
      return {
        phoneNumberId,
        status: 'released',
        releasedAt: phoneNumber.updatedAt,
      };
    }

    const activeAssignment = await this.assignments.findOne({
      where: { phoneNumberId, status: 'active' },
    });
    if (activeAssignment && !input.unassignFirst) {
      throw new ApplicationError(
        'PHONE_NUMBER_HAS_ASSIGNMENT',
        'Unassign this phone number from its agent before releasing, or set unassignFirst to true.',
        409,
      );
    }

    if (activeAssignment && input.unassignFirst) {
      await this.assignments.update(
        { id: activeAssignment.id },
        { status: 'ended', unassignedAt: new Date() },
      );
    }

    if (!phoneNumber.providerNumberId) {
      throw new ApplicationError(
        'PHONE_NUMBER_NOT_RELEASABLE',
        'This phone number cannot be released because it has no provider reference.',
        409,
      );
    }

    phoneNumber.status = 'release_pending';
    await this.phoneNumbers.save(phoneNumber);

    await this.telephony.releaseNumber(phoneNumber.providerNumberId);

    phoneNumber.status = 'released';
    if (input.releaseReason?.trim()) {
      phoneNumber.metadata = {
        ...(phoneNumber.metadata ?? {}),
        releaseReason: input.releaseReason.trim(),
      };
    }
    const saved = await this.phoneNumbers.save(phoneNumber);

    this.logger.log(
      `Released phone number ${saved.id} (${saved.phoneNumberE164}) for business ${businessId}`,
    );

    return {
      phoneNumberId,
      status: 'released',
      releasedAt: saved.updatedAt,
    };
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
        'Select an active business before managing phone numbers.',
        400,
      );
    }
    if (!options.allowArchivedBusiness && business.status === 'archived') {
      throw new ApplicationError(
        'ACTIVE_BUSINESS_REQUIRED',
        'Select an active business before managing phone numbers.',
        400,
      );
    }
    return business;
  }

  private async findOwnedPhoneNumber(
    businessId: string,
    phoneNumberId: string,
  ): Promise<PhoneNumber> {
    const phoneNumber = await this.phoneNumbers.findOne({
      where: { id: phoneNumberId, businessId },
    });
    if (!phoneNumber) {
      throw new ApplicationError(
        'PHONE_NUMBER_NOT_FOUND',
        'Phone number not found.',
        404,
      );
    }
    return phoneNumber;
  }

  private async assertNoActiveDuplicate(
    businessId: string,
    e164: string,
    provider?: string,
    providerNumberId?: string,
  ): Promise<void> {
    const existingByE164 = await this.phoneNumbers.findOne({
      where: {
        businessId,
        phoneNumberE164: e164,
        status: In(ACTIVE_INVENTORY_STATUSES),
      },
    });
    if (existingByE164) {
      throw new ApplicationError(
        'PHONE_NUMBER_ALREADY_EXISTS',
        'This phone number is already in the business inventory.',
        409,
      );
    }

    if (provider && providerNumberId) {
      const existingByProvider = await this.phoneNumbers.findOne({
        where: {
          provider,
          providerNumberId,
          status: In(ACTIVE_INVENTORY_STATUSES),
        },
      });
      if (existingByProvider) {
        throw new ApplicationError(
          'PHONE_NUMBER_ALREADY_EXISTS',
          'This provider phone number is already mapped in the inventory.',
          409,
        );
      }
    }
  }

  private toView(
    phoneNumber: PhoneNumber,
    role: Parameters<typeof canViewProviderNumberId>[0],
    assignment: PhoneNumberAssignment | null,
  ): PhoneNumberView {
    const activeAssignment =
      assignment && assignment.status === 'active'
        ? {
            id: assignment.id,
            agentId: assignment.agentId,
            agentName: assignment.agent?.name ?? 'Agent',
            status: assignment.status,
            assignedAt: assignment.assignedAt,
          }
        : null;

    const view: PhoneNumberView = {
      id: phoneNumber.id,
      phoneNumberE164: phoneNumber.phoneNumberE164,
      country: phoneNumber.country,
      provider: phoneNumber.provider,
      status: phoneNumber.status,
      capabilities: phoneNumber.capabilities ?? defaultCapabilities(),
      friendlyName: phoneNumber.friendlyName,
      assignment: activeAssignment,
      createdAt: phoneNumber.createdAt,
      updatedAt: phoneNumber.updatedAt,
    };

    if (canViewProviderNumberId(role) && phoneNumber.providerNumberId) {
      view.providerNumberId = phoneNumber.providerNumberId;
    }

    return view;
  }
}

function normalizeE164(value: string): string {
  return value.trim();
}

function deriveCountryFromE164(e164: string): string {
  const normalized = normalizeE164(e164);
  if (normalized.startsWith('+1')) return 'US';
  if (normalized.startsWith('+44')) return 'GB';
  if (normalized.startsWith('+61')) return 'AU';
  if (normalized.startsWith('+64')) return 'NZ';
  if (normalized.startsWith('+353')) return 'IE';
  if (normalized.startsWith('+49')) return 'DE';
  if (normalized.startsWith('+33')) return 'FR';
  return 'US';
}

function defaultCapabilities(): PhoneNumberCapabilities {
  return { voice: true, sms: false, mms: false };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof (error as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code === 'string' &&
    (error as QueryFailedError & { driverError?: { code?: string } }).driverError
      ?.code === '23505'
  );
}
