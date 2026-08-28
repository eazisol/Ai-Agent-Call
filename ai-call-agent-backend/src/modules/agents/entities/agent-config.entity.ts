import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  Agent,
  type AgentLanguage,
  type AgentLanguageMode,
  type AgentVoicePreference,
} from './agent.entity';

@Entity('agent_configs')
export class AgentConfig {
  @PrimaryColumn({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @OneToOne(() => Agent, (agent) => agent.config, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  /**
   * When true, effective language settings resolve from the parent business.
   * When false, agent-specific language mode / languages apply (subset of business).
   */
  @Column({
    name: 'use_business_language_settings',
    type: 'boolean',
    default: true,
  })
  useBusinessLanguageSettings!: boolean;

  /** Customer-facing mode: single language vs multilingual / auto-detect. */
  @Column({
    name: 'language_mode',
    type: 'varchar',
    length: 20,
    default: 'single',
  })
  languageMode!: AgentLanguageMode;

  /** Default / initial / fallback language when detection is unavailable. */
  @Column({ type: 'varchar', length: 20, default: 'en' })
  language!: AgentLanguage;

  /** Supported languages for this agent; must include `language`. */
  @Column({
    name: 'languages',
    type: 'jsonb',
    default: () => '\'["en"]\'::jsonb',
  })
  languages!: AgentLanguage[];

  /** Auto-detect caller language among `languages` (provider-neutral; M06 wires). */
  @Column({
    name: 'language_detection_enabled',
    type: 'boolean',
    default: false,
  })
  languageDetectionEnabled!: boolean;

  /** Allow mid-call language switch among `languages` when provider supports it. */
  @Column({
    name: 'language_switching_enabled',
    type: 'boolean',
    default: false,
  })
  languageSwitchingEnabled!: boolean;

  /**
   * Voice presentation preference (not biological gender).
   * Selected concrete voice lives in voice_id / provider mappings later (M08).
   */
  @Column({
    name: 'voice_preference',
    type: 'varchar',
    length: 20,
    default: 'neutral',
  })
  voicePreference!: AgentVoicePreference;

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

  /** Future M08 voice library FK placeholder — no FK enforced yet. */
  @Column({ name: 'voice_id', type: 'uuid', nullable: true })
  voiceId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
