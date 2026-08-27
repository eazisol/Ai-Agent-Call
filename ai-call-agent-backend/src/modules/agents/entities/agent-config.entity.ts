import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent, type AgentLanguage } from './agent.entity';

@Entity('agent_configs')
export class AgentConfig {
  @PrimaryColumn({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @OneToOne(() => Agent, (agent) => agent.config, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ type: 'varchar', length: 20, default: 'en' })
  language!: AgentLanguage;

  @Column({ name: 'escalation_enabled', type: 'boolean', default: false })
  escalationEnabled!: boolean;

  @Column({
    name: 'escalation_keywords',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  escalationKeywords!: string[];

  @Column({
    name: 'escalation_contact_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  escalationContactPhone!: string | null;

  @Column({
    name: 'escalation_contact_email',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  escalationContactEmail!: string | null;

  @Column({ name: 'escalation_message', type: 'text', nullable: true })
  escalationMessage!: string | null;

  @Column({ name: 'voice_id', type: 'uuid', nullable: true })
  voiceId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
