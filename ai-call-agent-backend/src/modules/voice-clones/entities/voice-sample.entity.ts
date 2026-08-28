import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '../../businesses/entities/business.entity';
import { VoiceClone } from './voice-clone.entity';

export const VOICE_SAMPLE_STATUSES = ['uploaded', 'deleted'] as const;
export type VoiceSampleStatus = (typeof VOICE_SAMPLE_STATUSES)[number];

@Entity('voice_samples')
export class VoiceSample {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voice_clone_id', type: 'uuid' })
  voiceCloneId!: string;

  @ManyToOne(() => VoiceClone, (clone) => clone.samples, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voice_clone_id' })
  voiceClone!: VoiceClone;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 120 })
  contentType!: string;

  @Column({ name: 'byte_size', type: 'bigint' })
  byteSize!: string;

  @Column({
    name: 'duration_seconds',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  durationSeconds!: string | null;

  @Column({ name: 'checksum_sha256', type: 'varchar', length: 128 })
  checksumSha256!: string;

  @Column({ type: 'varchar', length: 20, default: 'uploaded' })
  status!: VoiceSampleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
