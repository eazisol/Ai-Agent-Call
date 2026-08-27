import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

@Entity('agent_prompts')
export class AgentPrompt {
  @PrimaryColumn({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @OneToOne(() => Agent, (agent) => agent.prompts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ name: 'role_label', type: 'varchar', length: 100 })
  roleLabel!: string;

  @Column({ type: 'text', nullable: true })
  personality!: string | null;

  @Column({ type: 'text' })
  greeting!: string;

  @Column({ type: 'text' })
  instructions!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
