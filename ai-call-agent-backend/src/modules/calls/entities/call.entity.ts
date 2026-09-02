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
import { Agent } from '../../agents/entities/agent.entity';
import { Business } from '../../businesses/entities/business.entity';
import { PhoneNumber } from '../../phone-numbers/entities/phone-number.entity';
import { CallEvent } from './call-event.entity';
import { CallMessage } from './call-message.entity';
import { CallRecording } from './call-recording.entity';
import { EmailLog } from './email-log.entity';
import { CallProviderMapping } from './call-provider-mapping.entity';

export enum CallStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const CALL_DIRECTIONS = ['inbound', 'outbound'] as const;
export type CallDirection = (typeof CALL_DIRECTIONS)[number];

export const ROUTING_FAILURE_CODES = [
  'UNKNOWN_NUMBER',
  'UNASSIGNED_NUMBER',
  'INACTIVE_AGENT',
  'CROSS_BUSINESS_MAPPING',
  'UNSYNCED_AGENT',
  'PROVIDER_UNAVAILABLE',
  'HANDOFF_FAILED',
  'KNOWLEDGE_NOT_READY',
  'VOICE_NOT_READY',
] as const;
export type RoutingFailureCode = (typeof ROUTING_FAILURE_CODES)[number];

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'twilio_call_sid', length: 100, unique: true })
  twilioCallSid!: string;

  @Column({ name: 'caller_number', length: 30, nullable: true })
  callerNumber!: string;

  @Column({ name: 'receiver_number', length: 30, nullable: true })
  receiverNumber!: string;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.STARTED,
  })
  status!: CallStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  direction!: CallDirection | null;

  @Column({ name: 'failure_code', type: 'varchar', length: 50, nullable: true })
  failureCode!: string | null;

  @Column({
    name: 'failure_stage',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  failureStage!: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt!: Date;

  @Column({ nullable: true })
  duration!: number;

  @Column({ type: 'text', nullable: true })
  summary!: string;

  @Column({ type: 'text', nullable: true })
  conclusion!: string;

  @Column({ length: 50, nullable: true })
  sentiment!: string;

  @ManyToOne(() => Business, (business) => business.calls, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent | null;

  @ManyToOne(() => PhoneNumber, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'phone_number_id' })
  phoneNumber!: PhoneNumber | null;

  @OneToMany(() => CallMessage, (message) => message.call)
  messages!: CallMessage[];

  @OneToMany(() => CallRecording, (recording) => recording.call)
  recordings!: CallRecording[];

  @OneToMany(() => EmailLog, (emailLog) => emailLog.call)
  emailLogs!: EmailLog[];

  @OneToMany(() => CallProviderMapping, (mapping) => mapping.call)
  providerMappings!: CallProviderMapping[];

  @OneToMany(() => CallEvent, (event) => event.call)
  events!: CallEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
