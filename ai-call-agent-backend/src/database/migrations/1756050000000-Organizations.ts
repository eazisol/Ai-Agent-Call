import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Organizations1756050000000 implements MigrationInterface {
  name = 'Organizations1756050000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        slug varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_organizations_slug UNIQUE (slug)
      );

      CREATE TABLE organization_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar(20) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_organization_members_org_user UNIQUE (organization_id, user_id),
        CONSTRAINT chk_organization_members_role CHECK (role IN ('owner', 'member'))
      );

      CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
      CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS organization_members;
      DROP TABLE IF EXISTS organizations;
    `);
  }
}
