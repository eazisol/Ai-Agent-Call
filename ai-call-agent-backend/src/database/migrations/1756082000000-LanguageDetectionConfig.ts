import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Provider-neutral language detection / switching configuration.
 * Runtime ElevenLabs wiring is M06; this only stores SaaS config.
 */
export class LanguageDetectionConfig1756082000000 implements MigrationInterface {
  name = 'LanguageDetectionConfig1756082000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS language_detection_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS language_switching_enabled boolean NOT NULL DEFAULT false;

      -- Multi-language businesses: enable detect + switch by default.
      UPDATE businesses
      SET
        language_detection_enabled = true,
        language_switching_enabled = true
      WHERE jsonb_array_length(languages) > 1;

      ALTER TABLE agent_configs
        ADD COLUMN IF NOT EXISTS languages jsonb NOT NULL DEFAULT '["en"]'::jsonb,
        ADD COLUMN IF NOT EXISTS language_detection_enabled boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS language_switching_enabled boolean NOT NULL DEFAULT false;

      UPDATE agent_configs
      SET languages = jsonb_build_array(COALESCE(language, 'en'))
      WHERE languages IS NULL
         OR languages = '[]'::jsonb
         OR (
           languages = '["en"]'::jsonb
           AND language IS DISTINCT FROM 'en'
         );

      UPDATE agent_configs
      SET languages = (
        SELECT jsonb_agg(DISTINCT value)
        FROM (
          SELECT jsonb_array_elements_text(languages) AS value
          UNION
          SELECT COALESCE(language, 'en')
        ) AS combined
      );

      UPDATE agent_configs
      SET
        language_detection_enabled = true,
        language_switching_enabled = true
      WHERE jsonb_array_length(languages) > 1;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE agent_configs
        DROP COLUMN IF EXISTS language_switching_enabled,
        DROP COLUMN IF EXISTS language_detection_enabled,
        DROP COLUMN IF EXISTS languages;

      ALTER TABLE businesses
        DROP COLUMN IF EXISTS language_switching_enabled,
        DROP COLUMN IF EXISTS language_detection_enabled;
    `);
  }
}
