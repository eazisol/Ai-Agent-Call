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

import { RECOMMENDED_LANGUAGE_CODES } from '../../../common/i18n/language-catalogue';

export const BUSINESS_INDUSTRIES = [
  'healthcare',
  'restaurant',
  'retail',
  'professional_services',
  'hospitality',
  'other',
] as const;

export type BusinessIndustry = (typeof BUSINESS_INDUSTRIES)[number];

/** @deprecated Use language catalogue; kept as recommended starter codes. */
export const BUSINESS_LANGUAGES = [...RECOMMENDED_LANGUAGE_CODES] as const;

/** Canonical language identity = catalogue / BCP-47-compatible code string. */
export type BusinessLanguage = string;

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

  @Column({
    name: 'industry_label',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
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

  /** Supported languages for this business; must include defaultLanguage. */
  @Column({
    name: 'languages',
    type: 'jsonb',
    default: () => '\'["en"]\'::jsonb',
  })
  languages!: BusinessLanguage[];

  /**
   * When true, the voice agent should auto-detect caller language among
   * `languages` and respond in that language. Default language is fallback only.
   * Provider wiring (e.g. ElevenLabs) is M06.
   */
  @Column({
    name: 'language_detection_enabled',
    type: 'boolean',
    default: false,
  })
  languageDetectionEnabled!: boolean;

  /**
   * When true, mid-call language switching is allowed among `languages`
   * where the voice provider supports it. Provider wiring is M06.
   */
  @Column({
    name: 'language_switching_enabled',
    type: 'boolean',
    default: false,
  })
  languageSwitchingEnabled!: boolean;

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
