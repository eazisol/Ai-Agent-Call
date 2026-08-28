import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoiceAsset } from './voice-asset.entity';

@Entity('voice_provider_mappings')
export class VoiceProviderMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voice_asset_id', type: 'uuid' })
  voiceAssetId!: string;

  @ManyToOne(() => VoiceAsset, (asset) => asset.providerMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voice_asset_id' })
  voiceAsset!: VoiceAsset;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ name: 'external_voice_id', type: 'varchar', length: 255 })
  externalVoiceId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
