import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanEntitlement } from './plan-entitlement.entity';

export const PLAN_STATUSES = ['draft', 'active', 'archived'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_BILLING_VISIBILITIES = [
  'public',
  'authenticated',
  'internal',
] as const;
export type PlanBillingVisibility = (typeof PLAN_BILLING_VISIBILITIES)[number];

/** Internal compatibility plan — never customer-selectable or public. */
export const LEGACY_PRODUCTION_PLAN_CODE = 'legacy_production';

export type PlanComparisonMetadata = {
  headlineFeatures?: string[];
  limits?: {
    businesses?: number | null;
    agents?: number | null;
    phoneNumbers?: number | null;
    monthlyMinutes?: number | null;
  };
  ctaLabel?: string | null;
};

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: PlanStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'billing_visibility', type: 'varchar', length: 20 })
  billingVisibility!: PlanBillingVisibility;

  @Column({ name: 'is_recommended', type: 'boolean', default: false })
  isRecommended!: boolean;

  @Column({ name: 'trial_eligible', type: 'boolean', default: false })
  trialEligible!: boolean;

  @Column({ name: 'trial_days', type: 'int', nullable: true })
  trialDays!: number | null;

  /** Display metadata only — not a Stripe price id or charge amount. */
  @Column({ name: 'price_monthly_cents', type: 'int', nullable: true })
  priceMonthlyCents!: number | null;

  /** Display metadata only — not a Stripe price id or charge amount. */
  @Column({ name: 'price_annual_cents', type: 'int', nullable: true })
  priceAnnualCents!: number | null;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'comparison_metadata', type: 'jsonb', nullable: true })
  comparisonMetadata!: PlanComparisonMetadata | null;

  @OneToMany(() => PlanEntitlement, (entitlement) => entitlement.plan)
  entitlements!: PlanEntitlement[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
