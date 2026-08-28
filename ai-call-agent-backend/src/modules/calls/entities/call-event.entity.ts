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

export const CALL_EVENT_TYPES = [
  'CALL_RECEIVED',
  'ROUTING_RESOLVED',
  'CALL_STARTED',
  'CALL_CONNECTED',
  'CALL_COMPLETED',
  'CALL_FAILED',
  'HANDOFF_FAILED',
  'ROUTING_FAILED',
] as const;
export type CallEventType = (typeof CALL_EVENT_TYPES)[number];

export const CALL_EVENT_SOURCES = ['system', 'twilio', 'elevenlabs'] as const;
export type CallEventSource = (typeof CALL_EVENT_SOURCES)[number];

@Entity('call_events')
@Index(['callId', 'occurredAt'])
export class CallEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'call_id', type: 'uuid' })
  callId!: string;

  @ManyToOne(() => Call, (call) => call.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'call_id' })
  call!: Call;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: CallEventType;

  @Column({ type: 'varchar', length: 30 })
  source!: CallEventSource;

  @Column({
    name: 'external_event_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  externalEventId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
