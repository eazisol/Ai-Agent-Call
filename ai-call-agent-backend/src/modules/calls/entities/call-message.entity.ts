import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Call } from './call.entity';

export enum SpeakerType {
  CUSTOMER = 'customer',
  AI_AGENT = 'ai_agent',
  SYSTEM = 'system',
}

@Entity('call_messages')
export class CallMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Call, (call) => call.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'call_id' })
  call!: Call;

  @Column({
    type: 'enum',
    enum: SpeakerType,
  })
  speaker!: SpeakerType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'sequence_number', default: 0 })
  sequenceNumber!: number;

  @Column({ name: 'occurred_at', type: 'timestamp', nullable: true })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
