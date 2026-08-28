import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { User } from '../../auth/entities/user.entity';
import { PhoneNumber } from './phone-number.entity';

export const PHONE_NUMBER_ASSIGNMENT_STATUSES = ['active', 'ended'] as const;
export type PhoneNumberAssignmentStatus =
  (typeof PHONE_NUMBER_ASSIGNMENT_STATUSES)[number];

@Entity('phone_number_assignments')
export class PhoneNumberAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'phone_number_id', type: 'uuid' })
  phoneNumberId!: string;

  @ManyToOne(() => PhoneNumber, (phoneNumber) => phoneNumber.assignments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'phone_number_id' })
  phoneNumber!: PhoneNumber;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

  @ManyToOne(() => Agent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agent_id' })
  agent!: Agent;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: PhoneNumberAssignmentStatus;

  @Column({ name: 'assigned_by_user_id', type: 'uuid', nullable: true })
  assignedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser?: User | null;

  @Column({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @Column({ name: 'unassigned_at', type: 'timestamptz', nullable: true })
  unassignedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
