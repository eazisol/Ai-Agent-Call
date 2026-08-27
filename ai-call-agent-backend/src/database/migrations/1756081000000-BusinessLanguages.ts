import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds multi-language support for businesses while keeping default_language
 * as the primary language used by agents/calls later.
 */
export class BusinessLanguages1756081000000 implements MigrationInterface {
  name = 'BusinessLanguages1756081000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS languages jsonb NOT NULL DEFAULT '["en"]'::jsonb;

      UPDATE businesses
      SET languages = jsonb_build_array(COALESCE(default_language, 'en'))
      WHERE languages IS NULL
         OR languages = '[]'::jsonb
         OR languages = '["en"]'::jsonb AND default_language IS DISTINCT FROM 'en';

      -- Ensure default_language is always present in languages.
      UPDATE businesses
      SET languages = (
        SELECT jsonb_agg(DISTINCT value)
        FROM (
          SELECT jsonb_array_elements_text(languages) AS value
          UNION
          SELECT COALESCE(default_language, 'en')
        ) AS combined
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE businesses DROP COLUMN IF EXISTS languages;
    `);
  }
}
