import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '../../businesses/entities/business.entity';
import { PhoneNumberAssignment } from './phone-number-assignment.entity';

export const PHONE_NUMBER_STATUSES = [
  'provisioning',
  'active',
  'release_pending',
  'released',
  'failed',
] as const;
export type PhoneNumberStatus = (typeof PHONE_NUMBER_STATUSES)[number];

export type PhoneNumberCapabilities = {
  voice: boolean;
  sms: boolean;
  mms: boolean;
};

@Entity('phone_numbers')
export class PhoneNumber {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'provider_number_id', type: 'varchar', length: 150, nullable: true })
  providerNumberId!: string | null;

  @Column({ name: 'phone_number_e164', type: 'varchar', length: 30 })
  phoneNumberE164!: string;

  @Column({ type: 'varchar', length: 2 })
  country!: string;

  @Column({ type: 'jsonb', default: () => "'{\"voice\":true,\"sms\":false,\"mms\":false}'" })
  capabilities!: PhoneNumberCapabilities;

  @Column({ type: 'varchar', length: 30, default: 'provisioning' })
  status!: PhoneNumberStatus;

  @Column({ name: 'friendly_name', type: 'varchar', length: 64, nullable: true })
  friendlyName!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @OneToMany(() => PhoneNumberAssignment, (assignment) => assignment.phoneNumber)
  assignments?: PhoneNumberAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
