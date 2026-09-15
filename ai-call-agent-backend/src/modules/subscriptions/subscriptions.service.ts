import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlansService } from './plans.service';
import {
  LEGACY_PRODUCTION_PLAN_CODE,
  type Plan,
} from './entities/plan.entity';
import {
  Subscription,
  type SubscriptionStatus,
} from './entities/subscription.entity';

export interface SubscriptionView {
  organizationId: string;
  plan: {
    code: string;
    name: string;
  };
  status: SubscriptionStatus;
  trial: {
    start: string | null;
    end: string | null;
  };
  period: {
    start: string | null;
    end: string | null;
  };
  cancelAtPeriodEnd: boolean;
  capabilities: {
    canUpgrade: boolean;
    canManageBilling: boolean;
  };
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    private readonly plans: PlansService,
  ) {}

  async findByOrganizationId(
    organizationId: string,
  ): Promise<(Subscription & { plan: Plan }) | null> {
    return this.subscriptions.findOne({
      where: { organizationId },
      relations: { plan: true },
    });
  }

  /**
   * Deterministic current subscription for an organization.
   * Ensures legacy_production backfill when missing (idempotent).
   */
  async getOrEnsureForOrganization(
    organizationId: string,
  ): Promise<Subscription & { plan: Plan }> {
    const existing = await this.findByOrganizationId(organizationId);
    if (existing?.plan) {
      return existing;
    }

    return this.ensureLegacySubscription(organizationId);
  }

  async getViewForOrganization(
    organizationId: string,
  ): Promise<SubscriptionView> {
    const subscription = await this.getOrEnsureForOrganization(organizationId);
    return this.toView(subscription);
  }

  async ensureLegacySubscription(
    organizationId: string,
  ): Promise<Subscription & { plan: Plan }> {
    const existing = await this.findByOrganizationId(organizationId);
    if (existing?.plan) {
      return existing;
    }

    const plan = await this.plans.requireLegacyProductionPlan();
    const now = new Date();

    try {
      const created = await this.subscriptions.save(
        this.subscriptions.create({
          organizationId,
          planId: plan.id,
          status: 'active',
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: null,
          trialStart: null,
          trialEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          gracePeriodEnd: null,
        }),
      );
      this.logger.log(
        `subscription.legacy_ensured organizationId=${organizationId} plan=${LEGACY_PRODUCTION_PLAN_CODE}`,
      );
      return { ...created, plan };
    } catch (error) {
      // Unique constraint race — another writer created the row.
      const raced = await this.findByOrganizationId(organizationId);
      if (raced?.plan) {
        return raced;
      }
      throw error;
    }
  }

  private toView(
    subscription: Subscription & { plan: Plan },
  ): SubscriptionView {
    const isLegacy = subscription.plan.code === LEGACY_PRODUCTION_PLAN_CODE;
    return {
      organizationId: subscription.organizationId,
      plan: {
        code: subscription.plan.code,
        name: subscription.plan.name,
      },
      status: subscription.status,
      trial: {
        start: subscription.trialStart?.toISOString() ?? null,
        end: subscription.trialEnd?.toISOString() ?? null,
      },
      period: {
        start: subscription.currentPeriodStart?.toISOString() ?? null,
        end: subscription.currentPeriodEnd?.toISOString() ?? null,
      },
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      capabilities: {
        // Commercial catalog / checkout are PRODUCT DECISION + M27.
        canUpgrade: !isLegacy,
        canManageBilling: false,
      },
    };
  }
}
