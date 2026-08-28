import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamRolesAndInvitations1756060000000 implements MigrationInterface {
  name = 'TeamRolesAndInvitations1756060000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organization_members
      SET role = 'viewer'
      WHERE role = 'member';

      ALTER TABLE organization_members
        DROP CONSTRAINT IF EXISTS chk_organization_members_role;

      ALTER TABLE organization_members
        ADD CONSTRAINT chk_organization_members_role
        CHECK (role IN ('owner', 'admin', 'manager', 'viewer'));

      CREATE TABLE organization_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email varchar(320) NOT NULL,
        role varchar(20) NOT NULL,
        token_hash varchar(64) NOT NULL,
        invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        cancelled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_organization_invitations_token_hash UNIQUE (token_hash),
        CONSTRAINT chk_organization_invitations_role
          CHECK (role IN ('admin', 'manager', 'viewer'))
      );

      CREATE INDEX idx_organization_invitations_organization_id
        ON organization_invitations(organization_id);
      CREATE INDEX idx_organization_invitations_email
        ON organization_invitations(email);

      CREATE UNIQUE INDEX uq_organization_invitations_pending_org_email
        ON organization_invitations (organization_id, email)
        WHERE consumed_at IS NULL AND cancelled_at IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS organization_invitations;

      ALTER TABLE organization_members
        DROP CONSTRAINT IF EXISTS chk_organization_members_role;

      UPDATE organization_members
      SET role = 'member'
      WHERE role IN ('admin', 'manager', 'viewer');

      ALTER TABLE organization_members
        ADD CONSTRAINT chk_organization_members_role
        CHECK (role IN ('owner', 'member'));
    `);
  }
}
