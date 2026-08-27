import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  isCatalogueLanguageCode,
  normalizeLanguageCode,
} from '../../common/i18n/language-catalogue';
import { Agent } from '../agents/entities/agent.entity';
import { Call } from '../calls/entities/call.entity';
import { AiConfig } from '../openai-realtime/entities/ai-config.entity';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { assertBusinessCan } from './business-permissions';
import type {
  BusinessHourDto,
  BusinessSettingsDto,
  CreateBusinessDto,
} from './dto/create-business.dto';
import type { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessHour } from './entities/business-hour.entity';
import { BusinessSettings } from './entities/business-settings.entity';
import {
  BUSINESS_INDUSTRIES,
  Business,
  type BusinessIndustry,
  type BusinessLanguage,
  type BusinessStatus,
} from './entities/business.entity';

export interface BusinessSettingsView {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface BusinessHourView {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface BusinessView {
  id: string;
  organizationId: string;
  name: string;
  industry: BusinessIndustry;
  industryLabel: string | null;
  website: string | null;
  email: string;
  phone: string | null;
  timezone: string;
  defaultLanguage: BusinessLanguage;
  languages: BusinessLanguage[];
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  status: BusinessStatus;
  settings: BusinessSettingsView;
  hours: BusinessHourView[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly organizations: OrganizationsService,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(BusinessSettings)
    private readonly settings: Repository<BusinessSettings>,
    @InjectRepository(BusinessHour)
    private readonly hours: Repository<BusinessHour>,
    @InjectRepository(Call)
    private readonly calls: Repository<Call>,
    @InjectRepository(AiConfig)
    private readonly aiConfigs: Repository<AiConfig>,
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    input: CreateBusinessDto,
  ): Promise<BusinessView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertBusinessCan(membership.role, 'create_business');

    const fields = this.normalizeCoreFields(input, true);
    const hoursInput = this.normalizeHoursInput(input.hours);

    const saved = await this.dataSource.transaction(async (manager) => {
      const business = await manager.save(
        Business,
        manager.create(Business, {
          organizationId,
          name: fields.name,
          industry: fields.industry,
          industryLabel: fields.industryLabel,
          website: fields.website,
          email: fields.email,
          phoneNumber: fields.phone,
          timezone: fields.timezone,
          defaultLanguage: fields.defaultLanguage,
          languages: fields.languages,
          languageDetectionEnabled: fields.languageDetectionEnabled,
          languageSwitchingEnabled: fields.languageSwitchingEnabled,
          status: 'active',
          businessPrompt: null,
        }),
      );

      await manager.save(
        BusinessSettings,
        manager.create(BusinessSettings, {
          businessId: business.id,
          ...this.normalizeSettings(input.settings),
        }),
      );

      await manager.save(
        BusinessHour,
        hoursInput.map((hour) =>
          manager.create(BusinessHour, {
            businessId: business.id,
            dayOfWeek: hour.dayOfWeek,
            isClosed: hour.isClosed,
            opensAt: hour.opensAt,
            closesAt: hour.closesAt,
          }),
        ),
      );

      return business;
    });

    this.logger.log(
      `Created business ${saved.id} for organization ${organizationId} by user ${userId}`,
    );
    return this.getForUser(userId, organizationId, saved.id);
  }

  async listForUser(
    userId: string,
    organizationId: string,
    includeArchived = false,
  ): Promise<BusinessView[]> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertBusinessCan(membership.role, 'list_businesses');

    const where = includeArchived
      ? { organizationId }
      : { organizationId, status: 'active' as const };

    const rows = await this.businesses.find({
      where,
      relations: { settings: true, hours: true },
      order: { createdAt: 'ASC' },
    });

    return rows.map((row) => this.toView(row, membership.role));
  }

  async getForUser(
    userId: string,
    organizationId: string,
    businessId: string,
  ): Promise<BusinessView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertBusinessCan(membership.role, 'view_business');

    const business = await this.findOwnedBusiness(organizationId, businessId);
    return this.toView(business, membership.role);
  }

  async updateForUser(
    userId: string,
    organizationId: string,
    businessId: string,
    input: UpdateBusinessDto,
  ): Promise<BusinessView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );

    const hasNonStatusUpdate = Object.entries(input).some(
      ([key, value]) => key !== 'status' && value !== undefined,
    );
    if (hasNonStatusUpdate) {
      assertBusinessCan(membership.role, 'update_business');
    }
    if (input.status !== undefined) {
      // Archive and reactivate share the same privileged roles.
      assertBusinessCan(membership.role, 'archive_business');
    }
    if (!hasNonStatusUpdate && input.status === undefined) {
      throw new ApplicationError(
        'INVALID_BUSINESS',
        'No business fields provided to update.',
      );
    }

    const business = await this.findOwnedBusiness(organizationId, businessId);

    if (input.name !== undefined) {
      business.name = this.requireName(input.name);
    }
    if (input.industry !== undefined) {
      business.industry = this.requireIndustry(input.industry);
    }
    if (input.industryLabel !== undefined) {
      business.industryLabel = this.normalizeIndustryLabel(
        business.industry,
        input.industryLabel,
      );
    } else if (input.industry !== undefined && input.industry !== 'other') {
      business.industryLabel = null;
    }
    if (input.email !== undefined) {
      business.email = this.requireEmail(input.email);
    }
    if (input.phone !== undefined) {
      business.phoneNumber = this.normalizePhone(input.phone);
    }
    if (input.website !== undefined) {
      business.website = this.normalizeWebsite(input.website);
    }
    if (input.timezone !== undefined) {
      business.timezone = this.requireTimezone(input.timezone);
    }
    if (
      input.defaultLanguage !== undefined ||
      input.languages !== undefined ||
      input.languageDetectionEnabled !== undefined ||
      input.languageSwitchingEnabled !== undefined
    ) {
      const nextDefault =
        input.defaultLanguage !== undefined
          ? this.requireLanguage(input.defaultLanguage)
          : business.defaultLanguage;
      const nextLanguages =
        input.languages !== undefined
          ? this.requireLanguages(input.languages)
          : this.normalizeStoredLanguages(
              business.languages,
              business.defaultLanguage,
            );
      const languagePolicy = this.resolveLanguagePolicy({
        defaultLanguage: nextDefault,
        languages: nextLanguages,
        languageDetectionEnabled:
          input.languageDetectionEnabled ?? business.languageDetectionEnabled,
        languageSwitchingEnabled:
          input.languageSwitchingEnabled ?? business.languageSwitchingEnabled,
        explicitDetection: input.languageDetectionEnabled !== undefined,
        explicitSwitching: input.languageSwitchingEnabled !== undefined,
      });
      business.defaultLanguage = languagePolicy.defaultLanguage;
      // Clone so TypeORM always detects jsonb change (no shared refs).
      business.languages = [...languagePolicy.languages];
      business.languageDetectionEnabled =
        languagePolicy.languageDetectionEnabled;
      business.languageSwitchingEnabled =
        languagePolicy.languageSwitchingEnabled;
    }
    if (input.status !== undefined) {
      business.status = input.status;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Business, business);

      if (input.settings !== undefined) {
        let settings = await manager.findOne(BusinessSettings, {
          where: { businessId: business.id },
        });
        if (!settings) {
          settings = manager.create(BusinessSettings, {
            businessId: business.id,
          });
        }
        Object.assign(settings, this.normalizeSettings(input.settings));
        await manager.save(BusinessSettings, settings);
      }

      if (input.hours !== undefined) {
        const hoursInput = this.normalizeHoursInput(input.hours);
        await manager.delete(BusinessHour, { businessId: business.id });
        await manager.save(
          BusinessHour,
          hoursInput.map((hour) =>
            manager.create(BusinessHour, {
              businessId: business.id,
              dayOfWeek: hour.dayOfWeek,
              isClosed: hour.isClosed,
              opensAt: hour.opensAt,
              closesAt: hour.closesAt,
            }),
          ),
        );
      }
    });

    return this.getForUser(userId, organizationId, businessId);
  }

  async archiveForUser(
    userId: string,
    organizationId: string,
    businessId: string,
  ): Promise<BusinessView> {
    return this.updateForUser(userId, organizationId, businessId, {
      status: 'archived',
    });
  }

  async deleteForUser(
    userId: string,
    organizationId: string,
    businessId: string,
  ): Promise<{ deleted: true }> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertBusinessCan(membership.role, 'delete_business');

    const business = await this.findOwnedBusiness(organizationId, businessId);
    const dependents = await this.countDependents(business.id);
    if (dependents > 0) {
      throw new ApplicationError(
        'BUSINESS_HAS_DEPENDENTS',
        'This business has related records. Archive it instead of deleting.',
        409,
      );
    }

    await this.businesses.delete({ id: business.id });
    this.logger.log(
      `Deleted business ${business.id} for organization ${organizationId} by user ${userId}`,
    );
    return { deleted: true };
  }

  async resolveActiveForUser(
    userId: string,
    organizationId: string,
    businessId: string,
  ): Promise<BusinessView> {
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertBusinessCan(membership.role, 'switch_active_business');

    const business = await this.findOwnedBusiness(organizationId, businessId);
    if (business.status === 'archived') {
      throw new ApplicationError(
        'BUSINESS_ARCHIVED',
        'Archived businesses cannot be set as active. Reactivate first.',
        400,
      );
    }
    return this.toView(business, membership.role);
  }

  isValidIanaTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private async findOwnedBusiness(
    organizationId: string,
    businessId: string,
  ): Promise<Business> {
    const business = await this.businesses.findOne({
      where: { id: businessId, organizationId },
      relations: { settings: true, hours: true },
    });
    if (!business || !business.organizationId) {
      throw new ApplicationError(
        'BUSINESS_NOT_FOUND',
        'Business not found.',
        404,
      );
    }
    return business;
  }

  private async countDependents(businessId: string): Promise<number> {
    const [callCount, configCount, agentCount] = await Promise.all([
      this.calls
        .createQueryBuilder('call')
        .where('call.business_id = :businessId', { businessId })
        .getCount(),
      this.aiConfigs
        .createQueryBuilder('config')
        .where('config.business_id = :businessId', { businessId })
        .getCount(),
      this.agents
        .createQueryBuilder('agent')
        .where('agent.business_id = :businessId', { businessId })
        .getCount(),
    ]);
    return callCount + configCount + agentCount;
  }

  private normalizeCoreFields(
    input: CreateBusinessDto | UpdateBusinessDto,
    required: boolean,
  ) {
    if (required) {
      const create = input as CreateBusinessDto;
      return {
        name: this.requireName(create.name),
        industry: this.requireIndustry(create.industry),
        industryLabel: this.normalizeIndustryLabel(
          create.industry,
          create.industryLabel,
        ),
        email: this.requireEmail(create.email),
        phone: this.normalizePhone(create.phone),
        website: this.normalizeWebsite(create.website),
        timezone: this.requireTimezone(create.timezone),
        ...this.resolveLanguagePolicy({
          defaultLanguage: this.requireLanguage(create.defaultLanguage),
          languages: create.languages?.length
            ? create.languages
            : [create.defaultLanguage],
          languageDetectionEnabled: create.languageDetectionEnabled,
          languageSwitchingEnabled: create.languageSwitchingEnabled,
          explicitDetection: create.languageDetectionEnabled !== undefined,
          explicitSwitching: create.languageSwitchingEnabled !== undefined,
        }),
      };
    }
    throw new ApplicationError(
      'INVALID_BUSINESS',
      'Invalid business payload.',
    );
  }

  private resolveLanguagePolicy(input: {
    defaultLanguage: BusinessLanguage;
    languages: BusinessLanguage[] | string[];
    languageDetectionEnabled?: boolean;
    languageSwitchingEnabled?: boolean;
    explicitDetection?: boolean;
    explicitSwitching?: boolean;
  }): {
    defaultLanguage: BusinessLanguage;
    languages: BusinessLanguage[];
    languageDetectionEnabled: boolean;
    languageSwitchingEnabled: boolean;
  } {
    const unique = this.requireLanguages(input.languages);
    if (!unique.includes(input.defaultLanguage)) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Default language must be one of the selected languages.',
      );
    }

    const multi = unique.length > 1;
    const languageDetectionEnabled = input.explicitDetection
      ? input.languageDetectionEnabled === true
      : multi;
    const languageSwitchingEnabled = input.explicitSwitching
      ? input.languageSwitchingEnabled === true
      : multi;

    if (!multi && languageDetectionEnabled) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Language detection requires at least two supported languages.',
      );
    }
    if (!multi && languageSwitchingEnabled) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Language switching requires at least two supported languages.',
      );
    }
    if (languageSwitchingEnabled && !languageDetectionEnabled) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Language switching requires language detection to be enabled.',
      );
    }

    return {
      defaultLanguage: input.defaultLanguage,
      languages: unique,
      languageDetectionEnabled,
      languageSwitchingEnabled,
    };
  }

  private resolveLanguagePair(
    defaultLanguage: BusinessLanguage,
    languages: BusinessLanguage[],
  ): { defaultLanguage: BusinessLanguage; languages: BusinessLanguage[] } {
    const policy = this.resolveLanguagePolicy({
      defaultLanguage,
      languages,
      explicitDetection: true,
      explicitSwitching: true,
      languageDetectionEnabled: false,
      languageSwitchingEnabled: false,
    });
    return {
      defaultLanguage: policy.defaultLanguage,
      languages: policy.languages,
    };
  }

  private requireLanguages(languages: string[]): BusinessLanguage[] {
    if (!languages?.length) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Select at least one language.',
      );
    }
    const unique: BusinessLanguage[] = [];
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

  private normalizeStoredLanguages(
    languages: BusinessLanguage[] | null | undefined | string,
    defaultLanguage: BusinessLanguage,
  ): BusinessLanguage[] {
    const fallback = this.requireLanguage(defaultLanguage || 'en');
    let raw: unknown = languages;

    // Repair double-encoded / scalar jsonb reads.
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        try {
          raw = JSON.parse(trimmed) as unknown;
        } catch {
          raw = [trimmed];
        }
      } else if (trimmed) {
        raw = [trimmed];
      } else {
        raw = [];
      }
    }

    const list = Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === 'string')
      : [];

    const unique =
      list.length > 0 ? this.requireLanguages(list) : [fallback];

    if (!unique.includes(fallback)) {
      return [...unique, fallback];
    }
    return unique;
  }

  private requireName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ApplicationError(
        'INVALID_BUSINESS',
        'Business name is required.',
      );
    }
    if (trimmed.length > 150) {
      throw new ApplicationError(
        'INVALID_BUSINESS',
        'Business name must be at most 150 characters.',
      );
    }
    return trimmed;
  }

  private requireIndustry(industry: string): BusinessIndustry {
    if (!BUSINESS_INDUSTRIES.includes(industry as BusinessIndustry)) {
      throw new ApplicationError(
        'INVALID_BUSINESS_INDUSTRY',
        'Industry must be one of the supported values.',
      );
    }
    return industry as BusinessIndustry;
  }

  private normalizeIndustryLabel(
    industry: BusinessIndustry,
    label?: string | null,
  ): string | null {
    if (industry !== 'other') {
      return null;
    }
    if (label === undefined || label === null) {
      return null;
    }
    const trimmed = label.trim();
    return trimmed ? trimmed.slice(0, 100) : null;
  }

  private requireEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new ApplicationError(
        'INVALID_BUSINESS_EMAIL',
        'A valid business email is required.',
      );
    }
    return normalized;
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
        'INVALID_BUSINESS_PHONE',
        'Phone number format is invalid.',
      );
    }
    return trimmed;
  }

  private normalizeWebsite(website?: string | null): string | null {
    if (website === undefined || website === null) {
      return null;
    }
    const trimmed = website.trim();
    return trimmed || null;
  }

  private requireTimezone(timezone: string): string {
    const trimmed = timezone.trim();
    if (!trimmed || !this.isValidIanaTimezone(trimmed)) {
      throw new ApplicationError(
        'INVALID_TIMEZONE',
        'Timezone must be a valid IANA time zone (e.g. America/New_York).',
      );
    }
    return trimmed;
  }

  private requireLanguage(language: string): BusinessLanguage {
    const normalized = normalizeLanguageCode(language);
    if (!isCatalogueLanguageCode(normalized)) {
      throw new ApplicationError(
        'INVALID_LANGUAGE',
        'Language must be a supported catalogue language code (e.g. en, ur, fr).',
      );
    }
    return normalized;
  }

  private normalizeSettings(
    input?: BusinessSettingsDto,
  ): Omit<BusinessSettingsView, never> {
    return {
      addressLine1: this.nullableTrim(input?.addressLine1, 200),
      addressLine2: this.nullableTrim(input?.addressLine2, 200),
      city: this.nullableTrim(input?.city, 100),
      region: this.nullableTrim(input?.region, 100),
      postalCode: this.nullableTrim(input?.postalCode, 30),
      country: this.nullableTrim(input?.country, 100),
    };
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

  private normalizeHoursInput(
    hours?: BusinessHourDto[],
  ): Array<{
    dayOfWeek: number;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
  }> {
    const byDay = new Map<
      number,
      {
        dayOfWeek: number;
        isClosed: boolean;
        opensAt: string | null;
        closesAt: string | null;
      }
    >();

    for (const hour of hours ?? []) {
      if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
        throw new ApplicationError(
          'INVALID_BUSINESS_HOURS',
          'dayOfWeek must be between 0 (Sunday) and 6 (Saturday).',
        );
      }
      if (byDay.has(hour.dayOfWeek)) {
        throw new ApplicationError(
          'INVALID_BUSINESS_HOURS',
          'Each day of week may appear only once.',
        );
      }

      if (hour.isClosed) {
        byDay.set(hour.dayOfWeek, {
          dayOfWeek: hour.dayOfWeek,
          isClosed: true,
          opensAt: null,
          closesAt: null,
        });
        continue;
      }

      const opensAt = this.normalizeTime(hour.opensAt, 'opensAt');
      const closesAt = this.normalizeTime(hour.closesAt, 'closesAt');
      if (opensAt >= closesAt) {
        throw new ApplicationError(
          'INVALID_BUSINESS_HOURS',
          'opensAt must be earlier than closesAt for open days.',
        );
      }
      byDay.set(hour.dayOfWeek, {
        dayOfWeek: hour.dayOfWeek,
        isClosed: false,
        opensAt,
        closesAt,
      });
    }

    const result: Array<{
      dayOfWeek: number;
      isClosed: boolean;
      opensAt: string | null;
      closesAt: string | null;
    }> = [];
    for (let day = 0; day <= 6; day += 1) {
      result.push(
        byDay.get(day) ?? {
          dayOfWeek: day,
          isClosed: true,
          opensAt: null,
          closesAt: null,
        },
      );
    }
    return result;
  }

  private normalizeTime(
    value: string | null | undefined,
    field: string,
  ): string {
    if (!value || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
      throw new ApplicationError(
        'INVALID_BUSINESS_HOURS',
        `${field} must be HH:mm (24-hour).`,
      );
    }
    return value;
  }

  private toView(
    business: Business,
    _role: OrganizationMemberRole,
  ): BusinessView {
    if (!business.organizationId) {
      throw new ApplicationError(
        'BUSINESS_NOT_FOUND',
        'Business not found.',
        404,
      );
    }

    const settings = business.settings;
    const hours = [...(business.hours ?? [])].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek,
    );

    const hourViews: BusinessHourView[] = [];
    for (let day = 0; day <= 6; day += 1) {
      const match = hours.find((hour) => hour.dayOfWeek === day);
      hourViews.push(
        match
          ? {
              dayOfWeek: day,
              isClosed: match.isClosed,
              opensAt: this.formatTime(match.opensAt),
              closesAt: this.formatTime(match.closesAt),
            }
          : {
              dayOfWeek: day,
              isClosed: true,
              opensAt: null,
              closesAt: null,
            },
      );
    }

    return {
      id: business.id,
      organizationId: business.organizationId,
      name: business.name,
      industry: business.industry,
      industryLabel: business.industryLabel,
      website: business.website,
      email: business.email,
      phone: business.phoneNumber,
      timezone: business.timezone,
      defaultLanguage: business.defaultLanguage,
      languages: this.normalizeStoredLanguages(
        business.languages,
        business.defaultLanguage,
      ),
      languageDetectionEnabled: business.languageDetectionEnabled === true,
      languageSwitchingEnabled: business.languageSwitchingEnabled === true,
      status: business.status,
      settings: {
        addressLine1: settings?.addressLine1 ?? null,
        addressLine2: settings?.addressLine2 ?? null,
        city: settings?.city ?? null,
        region: settings?.region ?? null,
        postalCode: settings?.postalCode ?? null,
        country: settings?.country ?? null,
      },
      hours: hourViews,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  private formatTime(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    // Postgres time may arrive as HH:mm:ss
    return value.slice(0, 5);
  }
}
