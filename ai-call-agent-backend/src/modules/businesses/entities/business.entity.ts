import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Call } from '../../calls/entities/call.entity';
import { AiConfig } from '../../openai-realtime/entities/ai-config.entity';

@Entity('businesses')
export class Business {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 150 })
    name!: string;

    @Column({ length: 100, nullable: true })
    industry!: string;

    @Column({ name: 'phone_number', length: 30, nullable: true })
    phoneNumber!: string;

    @Column({ length: 150 })
    email!: string;

    @Column({ name: 'business_prompt', type: 'text', nullable: true })
    businessPrompt!: string;

    @Column({ length: 80, default: 'UTC' })
    timezone!: string;

    @OneToMany(() => Call, (call) => call.business)
    calls!: Call[];

    @OneToMany(() => AiConfig, (config) => config.business)
    aiConfigs!: AiConfig[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}