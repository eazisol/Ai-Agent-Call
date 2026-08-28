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
import { VoiceProviderMapping } from './voice-provider-mapping.entity';

export const VOICE_ASSET_SOURCE_TYPES = [
  'provider_catalog',
  'business_clone',
] as const;
export type VoiceAssetSourceType = (typeof VOICE_ASSET_SOURCE_TYPES)[number];

export const VOICE_ASSET_STATUSES = ['active', 'archived'] as const;
export type VoiceAssetStatus = (typeof VOICE_ASSET_STATUSES)[number];

export const VOICE_GENDER_PRESENTATIONS = [
  'female',
  'male',
  'neutral',
  'unknown',
] as const;
export type VoiceGenderPresentation =
  (typeof VOICE_GENDER_PRESENTATIONS)[number];

@Entity('voice_assets')
export class VoiceAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid', nullable: true })
  businessId!: string | null;

  @ManyToOne(() => Business, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'business_id' })
  business!: Business | null;

  @Column({ name: 'source_type', type: 'varchar', length: 30 })
  sourceType!: VoiceAssetSourceType;

  @Column({ name: 'display_name', type: 'varchar', length: 200 })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'language_codes', type: 'jsonb', default: () => "'[]'" })
  languageCodes!: string[];

  @Column({
    name: 'gender_presentation',
    type: 'varchar',
    length: 20,
    default: 'unknown',
  })
  genderPresentation!: VoiceGenderPresentation;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accent!: string | null;

  @Column({ name: 'style_labels', type: 'jsonb', default: () => "'[]'" })
  styleLabels!: string[];

  @Column({ name: 'preview_sample_text', type: 'text', nullable: true })
  previewSampleText!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: VoiceAssetStatus;

  @OneToMany(() => VoiceProviderMapping, (mapping) => mapping.voiceAsset)
  providerMappings?: VoiceProviderMapping[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
