import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M09 Voice Cloning: business-owned clone lifecycle, consent, private samples.
 */
export class VoiceCloning1756110000000 implements MigrationInterface {
  name = 'VoiceCloning1756110000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS voice_clones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        voice_asset_id uuid REFERENCES voice_assets(id) ON DELETE SET NULL,
        display_name varchar(200) NOT NULL,
        description text,
        status varchar(20) NOT NULL DEFAULT 'draft',
        provider varchar(50) NOT NULL DEFAULT 'elevenlabs',
        last_error text,
        submitted_at timestamptz,
        ready_at timestamptz,
        revoked_at timestamptz,
        created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_voice_clones_status CHECK (
          status IN ('draft', 'processing', 'failed', 'ready', 'revoked')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_voice_clones_business_id_status
        ON voice_clones(business_id, status);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_clones_voice_asset_id
        ON voice_clones(voice_asset_id)
        WHERE voice_asset_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS voice_consents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        voice_clone_id uuid NOT NULL REFERENCES voice_clones(id) ON DELETE CASCADE,
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        consent_version varchar(50) NOT NULL,
        consent_text_hash varchar(128) NOT NULL,
        accepted_at timestamptz NOT NULL DEFAULT now(),
        ip_address varchar(64),
        user_agent text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_voice_consents_voice_clone_id
        ON voice_consents(voice_clone_id);

      CREATE TABLE IF NOT EXISTS voice_samples (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        voice_clone_id uuid NOT NULL REFERENCES voice_clones(id) ON DELETE CASCADE,
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        storage_key varchar(512) NOT NULL,
        original_filename varchar(255) NOT NULL,
        content_type varchar(120) NOT NULL,
        byte_size bigint NOT NULL,
        duration_seconds numeric(10, 2),
        checksum_sha256 varchar(128) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'uploaded',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_voice_samples_status CHECK (
          status IN ('uploaded', 'deleted')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_voice_samples_voice_clone_id_status
        ON voice_samples(voice_clone_id, status);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS voice_samples;
      DROP TABLE IF EXISTS voice_consents;
      DROP TABLE IF EXISTS voice_clones;
    `);
  }
}
