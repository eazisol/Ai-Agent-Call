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
import { User } from '../../auth/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { VoiceAsset } from '../../voices/entities/voice-asset.entity';
import { VoiceConsent } from './voice-consent.entity';
import { VoiceSample } from './voice-sample.entity';

export const VOICE_CLONE_STATUSES = [
  'draft',
  'processing',
  'failed',
  'ready',
  'revoked',
] as const;
export type VoiceCloneStatus = (typeof VOICE_CLONE_STATUSES)[number];

@Entity('voice_clones')
export class VoiceClone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'voice_asset_id', type: 'uuid', nullable: true })
  voiceAssetId!: string | null;

  @ManyToOne(() => VoiceAsset, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voice_asset_id' })
  voiceAsset!: VoiceAsset | null;

  @Column({ name: 'display_name', type: 'varchar', length: 200 })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: VoiceCloneStatus;

  @Column({ type: 'varchar', length: 50, default: 'elevenlabs' })
  provider!: string;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @OneToMany(() => VoiceConsent, (consent) => consent.voiceClone)
  consents?: VoiceConsent[];

  @OneToMany(() => VoiceSample, (sample) => sample.voiceClone)
  samples?: VoiceSample[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
