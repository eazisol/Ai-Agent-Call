import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KnowledgeSource } from './knowledge-source.entity';

export const KNOWLEDGE_PROVIDER_SYNC_STATUSES = [
  'not_provisioned',
  'pending',
  'synced',
  'error',
] as const;
export type KnowledgeProviderSyncStatus =
  (typeof KNOWLEDGE_PROVIDER_SYNC_STATUSES)[number];

@Entity('knowledge_provider_mappings')
export class KnowledgeProviderMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'knowledge_source_id', type: 'uuid' })
  knowledgeSourceId!: string;

  @ManyToOne(() => KnowledgeSource, (source) => source.providerMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledge_source_id' })
  knowledgeSource!: KnowledgeSource;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({
    name: 'external_source_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalSourceId!: string | null;

  @Column({
    name: 'sync_status',
    type: 'varchar',
    length: 40,
    default: 'not_provisioned',
  })
  syncStatus!: KnowledgeProviderSyncStatus;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;

  @Column({ name: 'last_synced_version', type: 'integer', nullable: true })
  lastSyncedVersion!: number | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
