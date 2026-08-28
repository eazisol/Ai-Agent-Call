import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from '../../businesses/entities/business.entity';
import { AgentKnowledgeSource } from './agent-knowledge-source.entity';
import { KnowledgeProviderMapping } from './knowledge-provider-mapping.entity';

export const KNOWLEDGE_SOURCE_TYPES = ['file', 'url', 'text', 'faq'] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_STATUSES = ['active', 'archived'] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

export type KnowledgeFaqItem = {
  question: string;
  answer: string;
};

@Entity('knowledge_sources')
export class KnowledgeSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: KnowledgeSourceType;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: KnowledgeSourceStatus;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  language!: string | null;

  @Column({ type: 'text', nullable: true })
  url!: string | null;

  @Column({ name: 'text_body', type: 'text', nullable: true })
  textBody!: string | null;

  @Column({ name: 'faq_items', type: 'jsonb', nullable: true })
  faqItems!: KnowledgeFaqItem[] | null;

  @Column({ name: 'object_key', type: 'varchar', length: 1024, nullable: true })
  objectKey!: string | null;

  @Column({
    name: 'original_filename',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  originalFilename!: string | null;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  contentType!: string | null;

  @Column({ name: 'byte_size', type: 'integer', nullable: true })
  byteSize!: number | null;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash!: string | null;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @OneToMany(() => AgentKnowledgeSource, (row) => row.knowledgeSource)
  assignments?: AgentKnowledgeSource[];

  @OneToMany(() => KnowledgeProviderMapping, (row) => row.knowledgeSource)
  providerMappings?: KnowledgeProviderMapping[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
