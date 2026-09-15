import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import { Agent } from '../agents/entities/agent.entity';
import { Business } from '../businesses/entities/business.entity';
import { PhoneNumber } from '../phone-numbers/entities/phone-number.entity';
import {
  BOOLEAN_ENTITLEMENT_KEYS,
  ENTITLEMENT_KEYS,
  INTEGER_ENTITLEMENT_KEYS,
  isBooleanEntitlementKey,
  isIntegerEntitlementKey,
  type EntitlementKey,
} from './entitlement-keys';
import { PlanEntitlement } from './entities/plan-entitlement.entity';
import type { Plan } from './entities/plan.entity';
import {
  SUBSCRIPTION_ENTITLED_STATUSES,
  type Subscription,
  type SubscriptionStatus,
} from './entities/subscription.entity';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';

export type SubscriptionEnforcementMode = 'off' | 'enforce';

export type ResolvedEntitlementValue = boolean | number;

export interface ResolvedEntitlements {
  organizationId: string;
  planCode: string;
  status: SubscriptionStatus;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  entitlements: Record<string, ResolvedEntitlementValue>;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
    private readonly plans: PlansService,
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    @InjectRepository(PhoneNumber)
    private readonly phoneNumbers: Repository<PhoneNumber>,
  ) {}

  getEnforcementMode(): SubscriptionEnforcementMode {
    const mode = this.config.get<string>('subscription.enforcementMode');
    return mode === 'enforce' ? 'enforce' : 'off';
  }

  isEnforcementEnabled(): boolean {
    return this.getEnforcementMode() === 'enforce';
  }

  async getResolvedEntitlements(
    organizationId: string,
  ): Promise<ResolvedEntitlements> {
    const subscription =
      await this.subscriptions.getOrEnsureForOrganization(organizationId);
    const rows = await this.plans.listEntitlementsForPlan(subscription.planId);
    return this.buildResolved(organizationId, subscription, rows);
  }

  async getLimit(
    organizationId: string,
    key: EntitlementKey,
  ): Promise<number | null> {
    if (!isIntegerEntitlementKey(key)) {
      throw new ApplicationError(
        'INVALID_PLAN_ENTITLEMENT',
        'Entitlement key is not an integer limit.',
        400,
        { featureKey: key },
      );
    }
    const resolved = await this.getResolvedEntitlements(organizationId);
    if (!this.resolvedGrantsAccess(resolved)) {
      return 0;
    }
    const value = resolved.entitlements[key];
    return typeof value === 'number' ? value : null;
  }

  async canUseFeature(
    organizationId: string,
    key: EntitlementKey,
  ): Promise<boolean> {
    if (!isBooleanEntitlementKey(key)) {
      throw new ApplicationError(
        'INVALID_PLAN_ENTITLEMENT',
        'Entitlement key is not a boolean feature.',
        400,
        { featureKey: key },
      );
    }
    const resolved = await this.getResolvedEntitlements(organizationId);
    if (!this.resolvedGrantsAccess(resolved)) {
      return false;
    }
    return resolved.entitlements[key] === true;
  }

  async assertFeature(
    organizationId: string,
    key: EntitlementKey,
  ): Promise<void> {
    if (!this.isEnforcementEnabled()) {
      return;
    }
    await this.assertSubscriptionActive(organizationId);
    const allowed = await this.canUseFeature(organizationId, key);
    if (!allowed) {
      const resolved = await this.getResolvedEntitlements(organizationId);
      throw new ApplicationError(
        'FEATURE_NOT_INCLUDED',
        'This feature is not included in your current plan.',
        403,
        {
          featureKey: key,
          planCode: resolved.planCode,
          required_plan_action: 'upgrade',
        },
      );
    }
  }

  /**
   * @param projectedCount count after the intended create (e.g. current + 1)
   */
  async assertWithinLimit(
    organizationId: string,
    key: EntitlementKey,
    projectedCount: number,
  ): Promise<void> {
    if (!this.isEnforcementEnabled()) {
      return;
    }
    await this.assertSubscriptionActive(organizationId);
    const limit = await this.getLimit(organizationId, key);
    if (limit === null) {
      return;
    }
    if (projectedCount > limit) {
      const resolved = await this.getResolvedEntitlements(organizationId);
      throw new ApplicationError(
        'PLAN_LIMIT_REACHED',
        'You have reached the limit for your current plan.',
        403,
        {
          featureKey: key,
          limit,
          current: Math.max(0, projectedCount - 1),
          planCode: resolved.planCode,
          required_plan_action: 'upgrade',
        },
      );
    }
  }

  async assertSubscriptionActive(organizationId: string): Promise<void> {
    if (!this.isEnforcementEnabled()) {
      return;
    }

    const subscription =
      await this.subscriptions.getOrEnsureForOrganization(organizationId);
    const now = new Date();

    if (subscription.status === 'trialing') {
      if (subscription.trialEnd && subscription.trialEnd.getTime() < now.getTime()) {
        throw new ApplicationError(
          'TRIAL_EXPIRED',
          'Your trial has expired.',
          403,
          {
            trialEnd: subscription.trialEnd.toISOString(),
            status: subscription.status,
            required_plan_action: 'upgrade',
          },
        );
      }
      return;
    }

    if (subscription.status === 'canceled') {
      if (
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd.getTime() >= now.getTime()
      ) {
        return;
      }
      throw new ApplicationError(
        'SUBSCRIPTION_INACTIVE',
        'Your subscription is no longer active.',
        403,
        {
          status: subscription.status,
          required_plan_action: 'upgrade',
        },
      );
    }

    if (
      subscription.status === 'expired' ||
      subscription.status === 'suspended'
    ) {
      throw new ApplicationError(
        'SUBSCRIPTION_INACTIVE',
        'Your subscription is not active.',
        403,
        {
          status: subscription.status,
          required_plan_action: 'upgrade',
        },
      );
    }

    if (
      !(SUBSCRIPTION_ENTITLED_STATUSES as readonly string[]).includes(
        subscription.status,
      )
    ) {
      throw new ApplicationError(
        'SUBSCRIPTION_INACTIVE',
        'Your subscription is not active.',
        403,
        {
          status: subscription.status,
          required_plan_action: 'upgrade',
        },
      );
    }
  }

  async countActiveBusinesses(organizationId: string): Promise<number> {
    return this.businesses.count({
      where: { organizationId, status: 'active' },
    });
  }

  async countNonArchivedAgents(organizationId: string): Promise<number> {
    return this.agents
      .createQueryBuilder('agent')
      .innerJoin(Business, 'business', 'business.id = agent.business_id')
      .where('business.organization_id = :organizationId', { organizationId })
      .andWhere('agent.status != :archived', { archived: 'archived' })
      .getCount();
  }

  async countActivePhoneNumbers(organizationId: string): Promise<number> {
    return this.phoneNumbers
      .createQueryBuilder('phone')
      .innerJoin(Business, 'business', 'business.id = phone.business_id')
      .where('business.organization_id = :organizationId', { organizationId })
      .andWhere('phone.status IN (:...statuses)', {
        statuses: ['active', 'provisioning'],
      })
      .getCount();
  }

  async assertCanCreateBusiness(organizationId: string): Promise<void> {
    const current = await this.countActiveBusinesses(organizationId);
    await this.assertWithinLimit(
      organizationId,
      ENTITLEMENT_KEYS.BUSINESSES_MAX,
      current + 1,
    );
  }

  async assertCanCreateAgent(organizationId: string): Promise<void> {
    const current = await this.countNonArchivedAgents(organizationId);
    await this.assertWithinLimit(
      organizationId,
      ENTITLEMENT_KEYS.AGENTS_MAX,
      current + 1,
    );
  }

  async assertCanAddPhoneNumber(organizationId: string): Promise<void> {
    const current = await this.countActivePhoneNumbers(organizationId);
    await this.assertWithinLimit(
      organizationId,
      ENTITLEMENT_KEYS.PHONE_NUMBERS_MAX,
      current + 1,
    );
  }

  async assertCanUseVoiceCloning(organizationId: string): Promise<void> {
    await this.assertFeature(
      organizationId,
      ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
    );
  }

  private buildResolved(
    organizationId: string,
    subscription: Subscription & { plan: Plan },
    rows: PlanEntitlement[],
  ): ResolvedEntitlements {
    const entitlements: Record<string, ResolvedEntitlementValue> = {};
    const features: Record<string, boolean> = {};
    const limits: Record<string, number | null> = {};

    for (const key of BOOLEAN_ENTITLEMENT_KEYS) {
      features[key] = false;
      entitlements[key] = false;
    }
    for (const key of INTEGER_ENTITLEMENT_KEYS) {
      limits[key] = null;
    }

    for (const row of rows) {
      if (row.valueType === 'boolean' && typeof row.valueBoolean === 'boolean') {
        entitlements[row.entitlementKey] = row.valueBoolean;
        features[row.entitlementKey] = row.valueBoolean;
      } else if (
        row.valueType === 'integer' &&
        typeof row.valueInteger === 'number'
      ) {
        entitlements[row.entitlementKey] = row.valueInteger;
        limits[row.entitlementKey] = row.valueInteger;
      }
    }

    const resolved: ResolvedEntitlements = {
      organizationId,
      planCode: subscription.plan.code,
      status: subscription.status,
      trialEnd: subscription.trialEnd?.toISOString() ?? null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      entitlements,
      features,
      limits,
    };

    if (!this.resolvedGrantsAccess(resolved)) {
      for (const key of BOOLEAN_ENTITLEMENT_KEYS) {
        features[key] = false;
        entitlements[key] = false;
      }
      for (const key of INTEGER_ENTITLEMENT_KEYS) {
        limits[key] = 0;
        entitlements[key] = 0;
      }
    }

    return resolved;
  }

  private resolvedGrantsAccess(resolved: ResolvedEntitlements): boolean {
    const now = Date.now();
    if (resolved.status === 'trialing') {
      if (resolved.trialEnd && Date.parse(resolved.trialEnd) < now) {
        return false;
      }
      return true;
    }
    if (resolved.status === 'canceled') {
      if (
        resolved.currentPeriodEnd &&
        Date.parse(resolved.currentPeriodEnd) >= now
      ) {
        return true;
      }
      return false;
    }
    if (resolved.status === 'expired' || resolved.status === 'suspended') {
      return false;
    }
    return (SUBSCRIPTION_ENTITLED_STATUSES as readonly string[]).includes(
      resolved.status,
    );
  }
}
