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

@Entity('ai_configs')
export class AiConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Business, (business) => business.aiConfigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'model_name', length: 100, default: 'gpt-realtime' })
  modelName!: string;

  @Column({ length: 50, default: 'alloy' })
  voice!: string;

  @Column({ length: 20, default: 'en' })
  language!: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt!: string;

  @Column({ type: 'float', default: 0.7 })
  temperature!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
