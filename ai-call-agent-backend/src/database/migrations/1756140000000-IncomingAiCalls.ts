import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncomingAiCalls1756140000000 implements MigrationInterface {
  name = 'IncomingAiCalls1756140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE calls
        ADD COLUMN IF NOT EXISTS agent_id uuid,
        ADD COLUMN IF NOT EXISTS phone_number_id uuid,
        ADD COLUMN IF NOT EXISTS direction varchar(20),
        ADD COLUMN IF NOT EXISTS failure_code varchar(50),
        ADD COLUMN IF NOT EXISTS failure_stage varchar(50);

      UPDATE calls
      SET direction = 'inbound'
      WHERE direction IS NULL AND receiver_number IS NOT NULL;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_calls_agent'
        ) THEN
          ALTER TABLE calls
            ADD CONSTRAINT fk_calls_agent
            FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_calls_phone_number'
        ) THEN
          ALTER TABLE calls
            ADD CONSTRAINT fk_calls_phone_number
            FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id) ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_calls_business_started
        ON calls(business_id, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_calls_agent_started
        ON calls(agent_id, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_calls_phone_number
        ON calls(phone_number_id);

      CREATE INDEX IF NOT EXISTS idx_calls_status_business
        ON calls(status, business_id);

      CREATE TABLE IF NOT EXISTS call_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        event_type varchar(50) NOT NULL,
        source varchar(30) NOT NULL,
        external_event_id varchar(150),
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_call_events_call_occurred
        ON call_events(call_id, occurred_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_call_events_dedupe
        ON call_events(call_id, event_type, source, external_event_id)
        WHERE external_event_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_call_events_dedupe;
      DROP INDEX IF EXISTS idx_call_events_call_occurred;
      DROP TABLE IF EXISTS call_events;

      DROP INDEX IF EXISTS idx_calls_status_business;
      DROP INDEX IF EXISTS idx_calls_phone_number;
      DROP INDEX IF EXISTS idx_calls_agent_started;
      DROP INDEX IF EXISTS idx_calls_business_started;

      ALTER TABLE calls DROP CONSTRAINT IF EXISTS fk_calls_phone_number;
      ALTER TABLE calls DROP CONSTRAINT IF EXISTS fk_calls_agent;

      ALTER TABLE calls
        DROP COLUMN IF EXISTS failure_stage,
        DROP COLUMN IF EXISTS failure_code,
        DROP COLUMN IF EXISTS direction,
        DROP COLUMN IF EXISTS phone_number_id,
        DROP COLUMN IF EXISTS agent_id;
    `);
  }
}
