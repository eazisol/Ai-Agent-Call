import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('business_hours')
export class BusinessHour {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, (business) => business.hours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  /** 0 = Sunday … 6 = Saturday */
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @Column({ name: 'is_closed', default: true })
  isClosed!: boolean;

  @Column({ name: 'opens_at', type: 'time', nullable: true })
  opensAt!: string | null;

  @Column({ name: 'closes_at', type: 'time', nullable: true })
  closesAt!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
