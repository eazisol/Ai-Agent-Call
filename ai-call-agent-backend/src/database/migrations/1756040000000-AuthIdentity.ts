import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthIdentity1756040000000 implements MigrationInterface {
  name = 'AuthIdentity1756040000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(320) NOT NULL,
        password_hash varchar(255) NOT NULL,
        display_name varchar(120) NOT NULL,
        email_verified_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_users_email UNIQUE (email)
      );

      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        replaced_by_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash)
      );

      CREATE TABLE email_verification_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_email_verification_tokens_token_hash UNIQUE (token_hash)
      );

      CREATE TABLE password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_password_reset_tokens_token_hash UNIQUE (token_hash)
      );

      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
      CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
      CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS password_reset_tokens;
      DROP TABLE IF EXISTS email_verification_tokens;
      DROP TABLE IF EXISTS refresh_tokens;
      DROP TABLE IF EXISTS users;
    `);
  }
}
