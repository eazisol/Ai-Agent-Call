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

@Entity('provider_events')
@Index(['provider', 'externalEventId'], { unique: true })
export class ProviderEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Call, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'call_id' })
  call?: Call;

  @Column({ length: 50 })
  provider!: string;

  @Column({ name: 'external_event_id', length: 150 })
  externalEventId!: string;

  @Column({ name: 'event_type', length: 100 })
  eventType!: string;

  @Column({ name: 'payload_hash', length: 64 })
  payloadHash!: string;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt!: Date;
}
