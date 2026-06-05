import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Call } from './call.entity';

export enum EmailStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
}

@Entity('email_logs')
export class EmailLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Call, (call) => call.emailLogs, {
        onDelete: 'CASCADE',
    })
    call!: Call;

    @Column({ name: 'sent_to', length: 200 })
    sentTo!: string;

    @Column({
        type: 'enum',
        enum: EmailStatus,
        default: EmailStatus.PENDING,
    })
    status!: EmailStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage!: string;

    @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
    sentAt!: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}