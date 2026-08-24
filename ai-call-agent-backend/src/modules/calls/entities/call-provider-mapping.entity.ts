import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('call_provider_mappings')
@Index(['provider', 'externalCallId'], { unique: true })
export class CallProviderMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Call, (call) => call.providerMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'call_id' })
  call!: Call;

  @Column({ length: 50 })
  provider!: string;

  @Column({ name: 'external_call_id', length: 150 })
  externalCallId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
