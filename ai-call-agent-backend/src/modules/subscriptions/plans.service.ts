import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import {
  ALL_ENTITLEMENT_KEYS,
  BOOLEAN_ENTITLEMENT_KEYS,
  ENTITLEMENT_KEYS,
  expectedValueTypeForKey,
  isBooleanEntitlementKey,
  isEntitlementKey,
  isIntegerEntitlementKey,
  type EntitlementKey,
  type EntitlementValueType,
} from './entitlement-keys';
import { PlanEntitlement } from './entities/plan-entitlement.entity';
import {
  LEGACY_PRODUCTION_PLAN_CODE,
  Plan,
  type PlanBillingVisibility,
  type PlanComparisonMetadata,
  type PlanStatus,
} from './entities/plan.entity';

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string | null;
  status?: PlanStatus;
  sortOrder?: number;
  billingVisibility?: PlanBillingVisibility;
  isRecommended?: boolean;
  trialEligible?: boolean;
  trialDays?: number | null;
  priceMonthlyCents?: number | null;
  priceAnnualCents?: number | null;
  currency?: string;
  comparisonMetadata?: PlanComparisonMetadata | null;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string | null;
  status?: PlanStatus;
  sortOrder?: number;
  billingVisibility?: PlanBillingVisibility;
  isRecommended?: boolean;
  trialEligible?: boolean;
  trialDays?: number | null;
  priceMonthlyCents?: number | null;
  priceAnnualCents?: number | null;
  currency?: string;
  comparisonMetadata?: PlanComparisonMetadata | null;
}

export interface PlanEntitlementInput {
  entitlementKey: EntitlementKey;
  valueType: EntitlementValueType;
  valueBoolean?: boolean | null;
  valueInteger?: number | null;
}

export interface PublicPlanView {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isRecommended: boolean;
  trialEligible: boolean;
  trialDays: number | null;
  price: {
    currency: string;
    monthlyCents: number | null;
    annualCents: number | null;
  };
  comparison: PlanComparisonMetadata | null;
  ctaLabel: string | null;
}

export interface AuthenticatedPlanView extends PublicPlanView {
  currentPlanMatch: boolean;
}

/**
 * Platform-owned plan catalog.
 * Customer roles must never mutate plans — mutations are internal/service-only until M28.
 */
@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly plans: Repository<Plan>,
    @InjectRepository(PlanEntitlement)
    private readonly entitlements: Repository<PlanEntitlement>,
  ) {}

  async findByCode(code: string): Promise<Plan | null> {
    return this.plans.findOne({ where: { code } });
  }

  async requireByCode(code: string): Promise<Plan> {
    const plan = await this.findByCode(code);
    if (!plan) {
      throw new ApplicationError(
        'PLAN_NOT_FOUND',
        'Plan not found.',
        404,
        { code },
      );
    }
    return plan;
  }

  async requireLegacyProductionPlan(): Promise<Plan> {
    return this.requireByCode(LEGACY_PRODUCTION_PLAN_CODE);
  }

  async listPublicPlans(): Promise<PublicPlanView[]> {
    const plans = await this.plans.find({
      where: {
        status: 'active',
        billingVisibility: 'public',
      },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return plans.map((plan) => this.toPublicView(plan));
  }

  async listCustomerVisiblePlans(
    currentPlanCode: string | null,
  ): Promise<AuthenticatedPlanView[]> {
    const plans = await this.plans.find({
      where: {
        status: 'active',
        billingVisibility: In(['public', 'authenticated']),
      },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return plans.map((plan) => ({
      ...this.toPublicView(plan),
      currentPlanMatch: currentPlanCode === plan.code,
    }));
  }

  async listEntitlementsForPlan(planId: string): Promise<PlanEntitlement[]> {
    return this.entitlements.find({
      where: { planId },
      order: { entitlementKey: 'ASC' },
    });
  }

  /** Internal / seed / M28 — not exposed to tenant Owner/Admin roles. */
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    const code = input.code.trim().toLowerCase();
    if (!code || code.length > 64) {
      throw new ApplicationError(
        'INVALID_PLAN',
        'Plan code is required and must be at most 64 characters.',
      );
    }

    const existing = await this.findByCode(code);
    if (existing) {
      throw new ApplicationError(
        'PLAN_CODE_CONFLICT',
        'A plan with this code already exists.',
        409,
        { code },
      );
    }

    const plan = await this.plans.save(
      this.plans.create({
        code,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: input.status ?? 'draft',
        sortOrder: input.sortOrder ?? 0,
        billingVisibility: input.billingVisibility ?? 'internal',
        isRecommended: input.isRecommended ?? false,
        trialEligible: input.trialEligible ?? false,
        trialDays: input.trialDays ?? null,
        priceMonthlyCents: input.priceMonthlyCents ?? null,
        priceAnnualCents: input.priceAnnualCents ?? null,
        currency: (input.currency ?? 'USD').toUpperCase(),
        comparisonMetadata: input.comparisonMetadata ?? null,
      }),
    );

    this.logger.log(`plan.created code=${plan.code} id=${plan.id}`);
    return plan;
  }

  /** Internal / M28 — not exposed to tenant roles. */
  async updatePlan(planId: string, input: UpdatePlanInput): Promise<Plan> {
    const plan = await this.plans.findOne({ where: { id: planId } });
    if (!plan) {
      throw new ApplicationError('PLAN_NOT_FOUND', 'Plan not found.', 404);
    }

    if (input.name !== undefined) {
      plan.name = input.name.trim();
    }
    if (input.description !== undefined) {
      plan.description = input.description?.trim() || null;
    }
    if (input.status !== undefined) {
      plan.status = input.status;
    }
    if (input.sortOrder !== undefined) {
      plan.sortOrder = input.sortOrder;
    }
    if (input.billingVisibility !== undefined) {
      plan.billingVisibility = input.billingVisibility;
    }
    if (input.isRecommended !== undefined) {
      plan.isRecommended = input.isRecommended;
    }
    if (input.trialEligible !== undefined) {
      plan.trialEligible = input.trialEligible;
    }
    if (input.trialDays !== undefined) {
      plan.trialDays = input.trialDays;
    }
    if (input.priceMonthlyCents !== undefined) {
      plan.priceMonthlyCents = input.priceMonthlyCents;
    }
    if (input.priceAnnualCents !== undefined) {
      plan.priceAnnualCents = input.priceAnnualCents;
    }
    if (input.currency !== undefined) {
      plan.currency = input.currency.toUpperCase();
    }
    if (input.comparisonMetadata !== undefined) {
      plan.comparisonMetadata = input.comparisonMetadata;
    }

    const saved = await this.plans.save(plan);
    this.logger.log(`plan.updated code=${saved.code} id=${saved.id}`);
    return saved;
  }

  /** Soft-archive. RESTRICT on subscriptions prevents hard delete of referenced plans. */
  async archivePlan(planId: string): Promise<Plan> {
    return this.updatePlan(planId, { status: 'archived' });
  }

  /** Internal replace of entitlement set for a plan. */
  async replaceEntitlements(
    planId: string,
    rows: PlanEntitlementInput[],
  ): Promise<PlanEntitlement[]> {
    const plan = await this.plans.findOne({ where: { id: planId } });
    if (!plan) {
      throw new ApplicationError('PLAN_NOT_FOUND', 'Plan not found.', 404);
    }

    const validated = rows.map((row) => this.validateEntitlementInput(row));
    const keys = validated.map((row) => row.entitlementKey);
    if (new Set(keys).size !== keys.length) {
      throw new ApplicationError(
        'INVALID_PLAN_ENTITLEMENT',
        'Duplicate entitlement keys are not allowed for a plan.',
      );
    }

    await this.entitlements.delete({ planId });
    if (validated.length === 0) {
      return [];
    }

    const created = validated.map((row) =>
      this.entitlements.create({
        planId,
        entitlementKey: row.entitlementKey,
        valueType: row.valueType,
        valueBoolean: row.valueBoolean,
        valueInteger: row.valueInteger,
      }),
    );
    return this.entitlements.save(created);
  }

  private validateEntitlementInput(
    input: PlanEntitlementInput,
  ): Required<
    Pick<
      PlanEntitlementInput,
      'entitlementKey' | 'valueType' | 'valueBoolean' | 'valueInteger'
    >
  > {
    if (!isEntitlementKey(input.entitlementKey)) {
      throw new ApplicationError(
        'INVALID_PLAN_ENTITLEMENT',
        'Unknown entitlement key.',
        400,
        { entitlementKey: input.entitlementKey },
      );
    }

    const expected = expectedValueTypeForKey(input.entitlementKey);
    if (input.valueType !== expected) {
      throw new ApplicationError(
        'INVALID_PLAN_ENTITLEMENT',
        `Entitlement ${input.entitlementKey} requires value_type=${expected}.`,
        400,
      );
    }

    if (isBooleanEntitlementKey(input.entitlementKey)) {
      if (typeof input.valueBoolean !== 'boolean' || input.valueInteger != null) {
        throw new ApplicationError(
          'INVALID_PLAN_ENTITLEMENT',
          'Boolean entitlements require valueBoolean and null valueInteger.',
          400,
        );
      }
      return {
        entitlementKey: input.entitlementKey,
        valueType: 'boolean',
        valueBoolean: input.valueBoolean,
        valueInteger: null,
      };
    }

    if (
      typeof input.valueInteger !== 'number' ||
      !Number.isInteger(input.valueInteger) ||
      input.valueInteger < 0 ||
      input.valueBoolean != null
    ) {
      throw new ApplicationError(
        'INVALID_PLAN_ENTITLEMENT',
        'Integer entitlements require a non-negative integer valueInteger and null valueBoolean.',
        400,
      );
    }

    return {
      entitlementKey: input.entitlementKey,
      valueType: 'integer',
      valueBoolean: null,
      valueInteger: input.valueInteger,
    };
  }

  private toPublicView(plan: Plan): PublicPlanView {
    return {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      sortOrder: plan.sortOrder,
      isRecommended: plan.isRecommended,
      trialEligible: plan.trialEligible,
      trialDays: plan.trialDays,
      price: {
        currency: plan.currency,
        monthlyCents: plan.priceMonthlyCents,
        annualCents: plan.priceAnnualCents,
      },
      comparison: plan.comparisonMetadata,
      ctaLabel: plan.comparisonMetadata?.ctaLabel ?? null,
    };
  }
}

export { ALL_ENTITLEMENT_KEYS, ENTITLEMENT_KEYS };
