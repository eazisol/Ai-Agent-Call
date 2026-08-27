import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RECOMMENDED_LANGUAGE_CODES } from '../../../common/i18n/language-catalogue';
import { Business } from '../../businesses/entities/business.entity';
import { AgentConfig } from './agent-config.entity';
import { AgentPrompt } from './agent-prompt.entity';
import { AgentProviderMapping } from './agent-provider-mapping.entity';

export const AGENT_STATUSES = ['active', 'inactive', 'archived'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

/** @deprecated Use language catalogue; kept as recommended starter codes. */
export const AGENT_LANGUAGES = [...RECOMMENDED_LANGUAGE_CODES] as const;
export type AgentLanguage = string;

export const AGENT_LANGUAGE_MODES = ['single', 'multilingual'] as const;
export type AgentLanguageMode = (typeof AGENT_LANGUAGE_MODES)[number];

export const AGENT_VOICE_PREFERENCES = ['female', 'male', 'neutral'] as const;
export type AgentVoicePreference = (typeof AGENT_VOICE_PREFERENCES)[number];

@Entity('ai_agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: AgentStatus;

  @OneToOne(() => AgentConfig, (config) => config.agent)
  config?: AgentConfig | null;

  @OneToOne(() => AgentPrompt, (prompt) => prompt.agent)
  prompts?: AgentPrompt | null;

  @OneToMany(() => AgentProviderMapping, (mapping) => mapping.agent)
  providerMappings?: AgentProviderMapping[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
