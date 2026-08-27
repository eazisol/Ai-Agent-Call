import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Call } from '../../calls/entities/call.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { AiConfig } from '../../openai-realtime/entities/ai-config.entity';
import { BusinessHour } from './business-hour.entity';
import { BusinessSettings } from './business-settings.entity';

export const BUSINESS_INDUSTRIES = [
  'healthcare',
  'restaurant',
  'retail',
  'professional_services',
  'hospitality',
  'other',
] as const;

export type BusinessIndustry = (typeof BUSINESS_INDUSTRIES)[number];

export const BUSINESS_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'hi',
  'ur',
] as const;

export type BusinessLanguage = (typeof BUSINESS_LANGUAGES)[number];

export const BUSINESS_STATUSES = ['active', 'archived'] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization | null;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 100 })
  industry!: BusinessIndustry;

  @Column({ name: 'industry_label', type: 'varchar', length: 100, nullable: true })
  industryLabel!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ length: 150 })
  email!: string;

  @Column({ name: 'business_prompt', type: 'text', nullable: true })
  businessPrompt!: string | null;

  @Column({ length: 80, default: 'UTC' })
  timezone!: string;

  @Column({ name: 'default_language', length: 20, default: 'en' })
  defaultLanguage!: BusinessLanguage;

  @Column({ length: 20, default: 'active' })
  status!: BusinessStatus;

  @OneToOne(() => BusinessSettings, (settings) => settings.business, {
    cascade: true,
  })
  settings!: BusinessSettings | null;

  @OneToMany(() => BusinessHour, (hour) => hour.business, { cascade: true })
  hours!: BusinessHour[];

  @OneToMany(() => Call, (call) => call.business)
  calls!: Call[];

  @OneToMany(() => AiConfig, (config) => config.business)
  aiConfigs!: AiConfig[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
