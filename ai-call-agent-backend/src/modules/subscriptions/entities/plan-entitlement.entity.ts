import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { EntitlementValueType } from '../entitlement-keys';
import { Plan } from './plan.entity';

@Entity('plan_entitlements')
@Unique('uq_plan_entitlements_plan_key', ['planId', 'entitlementKey'])
export class PlanEntitlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan, (plan) => plan.entitlements, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'entitlement_key', type: 'varchar', length: 80 })
  entitlementKey!: string;

  @Column({ name: 'value_type', type: 'varchar', length: 16 })
  valueType!: EntitlementValueType;

  @Column({ name: 'value_boolean', type: 'boolean', nullable: true })
  valueBoolean!: boolean | null;

  @Column({ name: 'value_integer', type: 'int', nullable: true })
  valueInteger!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
