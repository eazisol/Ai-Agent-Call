import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M10 Twilio Telephony Provider: provider-level phone number mappings for audit.
 * Business ownership lives in M11 `phone_numbers`; no tenant columns here.
 */
export class TwilioTelephonyProvider1756120000000 implements MigrationInterface {
  name = 'TwilioTelephonyProvider1756120000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telephony_provider_mappings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar(50) NOT NULL,
        resource_type varchar(50) NOT NULL DEFAULT 'phone_number',
        external_resource_id varchar(150) NOT NULL,
        phone_number varchar(30),
        status varchar(30) NOT NULL DEFAULT 'active',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_telephony_provider_mappings_status CHECK (
          status IN ('active', 'released')
        ),
        CONSTRAINT uq_telephony_provider_mappings_provider_external
          UNIQUE (provider, external_resource_id)
      );

      CREATE INDEX IF NOT EXISTS idx_telephony_provider_mappings_provider_status
        ON telephony_provider_mappings(provider, status);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS telephony_provider_mappings;
    `);
  }
}
