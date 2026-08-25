import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persist identity emails case-insensitively:
 * User@Example.com and user@example.com are the same account key.
 */
export class UsersEmailCaseInsensitive1756041000000
  implements MigrationInterface
{
  name = 'UsersEmailCaseInsensitive1756041000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users SET email = LOWER(email);

      ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email;
      DROP INDEX IF EXISTS uq_users_email;
      DROP INDEX IF EXISTS "IDX_users_email";

      CREATE UNIQUE INDEX uq_users_email_lower ON users ((LOWER(email)));
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_users_email_lower;
      ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
    `);
  }
}
