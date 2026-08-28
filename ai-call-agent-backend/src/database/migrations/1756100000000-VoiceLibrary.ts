import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M08 Voice Library: platform/business voice_assets + provider mappings +
 * agent_configs.voice_id FK (per-agent assignment).
 */
export class VoiceLibrary1756100000000 implements MigrationInterface {
  name = 'VoiceLibrary1756100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS voice_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
        source_type varchar(30) NOT NULL,
        display_name varchar(200) NOT NULL,
        description text,
        language_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
        gender_presentation varchar(20) NOT NULL DEFAULT 'unknown',
        accent varchar(100),
        style_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
        preview_sample_text text,
        status varchar(20) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_voice_assets_source_type CHECK (
          source_type IN ('provider_catalog', 'business_clone')
        ),
        CONSTRAINT chk_voice_assets_status CHECK (
          status IN ('active', 'archived')
        ),
        CONSTRAINT chk_voice_assets_gender_presentation CHECK (
          gender_presentation IN ('female', 'male', 'neutral', 'unknown')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_voice_assets_business_id_status
        ON voice_assets(business_id, status)
        WHERE business_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_voice_assets_source_type_status
        ON voice_assets(source_type, status);

      CREATE TABLE IF NOT EXISTS voice_provider_mappings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        voice_asset_id uuid NOT NULL REFERENCES voice_assets(id) ON DELETE CASCADE,
        provider varchar(50) NOT NULL,
        external_voice_id varchar(255) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_voice_provider_mappings_asset_provider
          UNIQUE (voice_asset_id, provider),
        CONSTRAINT uq_voice_provider_mappings_provider_external
          UNIQUE (provider, external_voice_id)
      );

      CREATE INDEX IF NOT EXISTS idx_voice_provider_mappings_voice_asset_id
        ON voice_provider_mappings(voice_asset_id);

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_agent_configs_voice_id_voice_assets'
        ) THEN
          ALTER TABLE agent_configs
            ADD CONSTRAINT fk_agent_configs_voice_id_voice_assets
            FOREIGN KEY (voice_id) REFERENCES voice_assets(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE agent_configs
        DROP CONSTRAINT IF EXISTS fk_agent_configs_voice_id_voice_assets;

      DROP TABLE IF EXISTS voice_provider_mappings;
      DROP TABLE IF EXISTS voice_assets;
    `);
  }
}
