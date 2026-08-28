import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M11 Phone Number Management: canonical business inventory + agent assignments.
 */
export class PhoneNumberManagement1756130000000 implements MigrationInterface {
  name = 'PhoneNumberManagement1756130000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS phone_numbers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
        provider varchar(50) NOT NULL,
        provider_number_id varchar(150),
        phone_number_e164 varchar(30) NOT NULL,
        country varchar(2) NOT NULL,
        capabilities jsonb NOT NULL DEFAULT '{"voice":true,"sms":false,"mms":false}'::jsonb,
        status varchar(30) NOT NULL DEFAULT 'provisioning',
        friendly_name varchar(64),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_phone_numbers_status CHECK (
          status IN ('provisioning', 'active', 'release_pending', 'released', 'failed')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_phone_numbers_business_status
        ON phone_numbers(business_id, status);

      CREATE INDEX IF NOT EXISTS idx_phone_numbers_e164
        ON phone_numbers(phone_number_e164);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_numbers_business_e164_active
        ON phone_numbers(business_id, phone_number_e164)
        WHERE status IN ('provisioning', 'active', 'release_pending');

      CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_numbers_provider_sid_active
        ON phone_numbers(provider, provider_number_id)
        WHERE provider_number_id IS NOT NULL
          AND status IN ('provisioning', 'active', 'release_pending');

      CREATE TABLE IF NOT EXISTS phone_number_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number_id uuid NOT NULL REFERENCES phone_numbers(id) ON DELETE RESTRICT,
        agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE RESTRICT,
        status varchar(20) NOT NULL DEFAULT 'active',
        assigned_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        assigned_at timestamptz NOT NULL DEFAULT now(),
        unassigned_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_phone_number_assignments_status CHECK (
          status IN ('active', 'ended')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_phone_number_assignments_agent_status
        ON phone_number_assignments(agent_id, status);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_number_assignments_one_active
        ON phone_number_assignments(phone_number_id)
        WHERE status = 'active';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS phone_number_assignments;
      DROP TABLE IF EXISTS phone_numbers;
    `);
  }
}
