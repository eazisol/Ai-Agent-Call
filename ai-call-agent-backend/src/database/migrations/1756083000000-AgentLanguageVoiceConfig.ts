import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agent language mode, business-defaults inheritance, and voice preference.
 * Preserves existing language columns; expands language codes beyond the MVP-8 check.
 */
export class AgentLanguageVoiceConfig1756083000000
  implements MigrationInterface
{
  name = 'AgentLanguageVoiceConfig1756083000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Drop MVP-8 check so catalogue codes (e.g. it, ja) can be stored.
      ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS chk_agent_configs_language;

      ALTER TABLE agent_configs
        ADD COLUMN IF NOT EXISTS use_business_language_settings boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS language_mode varchar(20) NOT NULL DEFAULT 'single',
        ADD COLUMN IF NOT EXISTS voice_preference varchar(20) NOT NULL DEFAULT 'neutral';

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_agent_configs_language_mode'
        ) THEN
          ALTER TABLE agent_configs
            ADD CONSTRAINT chk_agent_configs_language_mode
            CHECK (language_mode IN ('single', 'multilingual'));
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_agent_configs_voice_preference'
        ) THEN
          ALTER TABLE agent_configs
            ADD CONSTRAINT chk_agent_configs_voice_preference
            CHECK (voice_preference IN ('female', 'male', 'neutral'));
        END IF;
      END $$;

      -- Derive mode from existing language arrays.
      UPDATE agent_configs
      SET language_mode = CASE
        WHEN jsonb_array_length(languages) > 1 THEN 'multilingual'
        ELSE 'single'
      END;

      -- Existing agents already customized language locally → mark as customized.
      UPDATE agent_configs
      SET use_business_language_settings = false
      WHERE jsonb_array_length(languages) > 1
         OR language_detection_enabled = true
         OR language_switching_enabled = true;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS chk_agent_configs_voice_preference;
      ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS chk_agent_configs_language_mode;
      ALTER TABLE agent_configs
        DROP COLUMN IF EXISTS voice_preference,
        DROP COLUMN IF EXISTS language_mode,
        DROP COLUMN IF EXISTS use_business_language_settings;
    `);
  }
}
