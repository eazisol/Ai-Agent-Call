import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Business } from '../../businesses/entities/business.entity';
import { VoiceClone } from './voice-clone.entity';

@Entity('voice_consents')
export class VoiceConsent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voice_clone_id', type: 'uuid' })
  voiceCloneId!: string;

  @ManyToOne(() => VoiceClone, (clone) => clone.consents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voice_clone_id' })
  voiceClone!: VoiceClone;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'consent_version', type: 'varchar', length: 50 })
  consentVersion!: string;

  @Column({ name: 'consent_text_hash', type: 'varchar', length: 128 })
  consentTextHash!: string;

  @Column({ name: 'accepted_at', type: 'timestamptz' })
  acceptedAt!: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
