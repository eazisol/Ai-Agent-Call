import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessManagement1756070000000 implements MigrationInterface {
  name = 'BusinessManagement1756070000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS organization_id uuid,
        ADD COLUMN IF NOT EXISTS industry_label varchar(100),
        ADD COLUMN IF NOT EXISTS website varchar(255),
        ADD COLUMN IF NOT EXISTS default_language varchar(20) NOT NULL DEFAULT 'en',
        ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'active';

      -- Legacy free-text industries become "other" with the prior label preserved.
      UPDATE businesses
      SET
        industry_label = COALESCE(industry_label, industry),
        industry = 'other'
      WHERE industry IS NOT NULL
        AND industry NOT IN (
          'healthcare',
          'restaurant',
          'retail',
          'professional_services',
          'hospitality',
          'other'
        );

      UPDATE businesses
      SET industry = 'other'
      WHERE industry IS NULL OR industry = '';

      ALTER TABLE businesses
        ALTER COLUMN industry SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_businesses_organization'
        ) THEN
          ALTER TABLE businesses
            ADD CONSTRAINT fk_businesses_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_industry'
        ) THEN
          ALTER TABLE businesses
            ADD CONSTRAINT chk_businesses_industry
            CHECK (
              industry IN (
                'healthcare',
                'restaurant',
                'retail',
                'professional_services',
                'hospitality',
                'other'
              )
            );
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_status'
        ) THEN
          ALTER TABLE businesses
            ADD CONSTRAINT chk_businesses_status
            CHECK (status IN ('active', 'archived'));
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_businesses_organization_id_status
        ON businesses(organization_id, status);

      CREATE TABLE IF NOT EXISTS business_settings (
        business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
        address_line1 varchar(200),
        address_line2 varchar(200),
        city varchar(100),
        region varchar(100),
        postal_code varchar(30),
        country varchar(100),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS business_hours (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        day_of_week smallint NOT NULL,
        is_closed boolean NOT NULL DEFAULT true,
        opens_at time,
        closes_at time,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_business_hours_business_day UNIQUE (business_id, day_of_week),
        CONSTRAINT chk_business_hours_day CHECK (day_of_week BETWEEN 0 AND 6)
      );

      CREATE INDEX IF NOT EXISTS idx_business_hours_business_id
        ON business_hours(business_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS business_hours;
      DROP TABLE IF EXISTS business_settings;

      DROP INDEX IF EXISTS idx_businesses_organization_id_status;

      ALTER TABLE businesses
        DROP CONSTRAINT IF EXISTS fk_businesses_organization,
        DROP CONSTRAINT IF EXISTS chk_businesses_industry,
        DROP CONSTRAINT IF EXISTS chk_businesses_status;

      ALTER TABLE businesses
        DROP COLUMN IF EXISTS organization_id,
        DROP COLUMN IF EXISTS industry_label,
        DROP COLUMN IF EXISTS website,
        DROP COLUMN IF EXISTS default_language,
        DROP COLUMN IF EXISTS status;
    `);
  }
}
