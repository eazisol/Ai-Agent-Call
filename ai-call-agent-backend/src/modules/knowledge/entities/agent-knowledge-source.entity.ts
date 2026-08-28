import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { KnowledgeSource } from './knowledge-source.entity';

@Entity('agent_knowledge_sources')
export class AgentKnowledgeSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ name: 'knowledge_source_id', type: 'uuid' })
  knowledgeSourceId!: string;

  @ManyToOne(() => KnowledgeSource, (source) => source.assignments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'knowledge_source_id' })
  knowledgeSource!: KnowledgeSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
