import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TelephonyMappingStatus = 'active' | 'released';

@Entity('telephony_provider_mappings')
@Index(['provider', 'externalResourceId'], { unique: true })
export class TelephonyProviderMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50 })
  provider!: string;

  @Column({ name: 'resource_type', length: 50, default: 'phone_number' })
  resourceType!: string;

  @Column({ name: 'external_resource_id', length: 150 })
  externalResourceId!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'active' })
  status!: TelephonyMappingStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
