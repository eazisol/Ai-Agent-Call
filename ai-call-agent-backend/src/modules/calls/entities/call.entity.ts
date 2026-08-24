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
  business!: Business;

  @OneToMany(() => CallMessage, (message) => message.call)
  messages!: CallMessage[];

  @OneToMany(() => CallRecording, (recording) => recording.call)
  recordings!: CallRecording[];

  @OneToMany(() => EmailLog, (emailLog) => emailLog.call)
  emailLogs!: EmailLog[];

  @OneToMany(() => CallProviderMapping, (mapping) => mapping.call)
  providerMappings!: CallProviderMapping[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
