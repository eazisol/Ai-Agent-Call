import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('call_recordings')
export class CallRecording {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Call, (call) => call.recordings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'call_id' })
  call!: Call;

  @Column({ name: 'recording_url', type: 'text' })
  recordingUrl!: string;

  @Column({ name: 'storage_provider', length: 50, default: 'twilio' })
  storageProvider!: string;

  @Column({ nullable: true })
  duration!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
