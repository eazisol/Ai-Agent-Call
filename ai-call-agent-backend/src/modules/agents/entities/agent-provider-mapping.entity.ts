import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

export const AGENT_PROVIDER_SYNC_STATUSES = [
  'not_provisioned',
  'pending',
  'synced',
  'error',
] as const;
export type AgentProviderSyncStatus =
  (typeof AGENT_PROVIDER_SYNC_STATUSES)[number];

@Entity('agent_provider_mappings')
export class AgentProviderMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @ManyToOne(() => Agent, (agent) => agent.providerMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({
    name: 'external_agent_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalAgentId!: string | null;

  @Column({
    name: 'sync_status',
    type: 'varchar',
    length: 40,
    default: 'not_provisioned',
  })
  syncStatus!: AgentProviderSyncStatus;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
