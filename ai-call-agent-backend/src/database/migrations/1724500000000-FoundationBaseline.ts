import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FoundationBaseline1724500000000 implements MigrationInterface {
  name = 'FoundationBaseline1724500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE call_status_enum AS ENUM ('started', 'in_progress', 'completed', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE speaker_type_enum AS ENUM ('customer', 'ai_agent', 'system');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE email_status_enum AS ENUM ('pending', 'sent', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS businesses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(150) NOT NULL,
        industry varchar(100),
        phone_number varchar(30),
        email varchar(150) NOT NULL,
        business_prompt text,
        timezone varchar(80) NOT NULL DEFAULT 'UTC',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS calls (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        twilio_call_sid varchar(100) NOT NULL UNIQUE,
        caller_number varchar(30),
        receiver_number varchar(30),
        status call_status_enum NOT NULL DEFAULT 'started',
        started_at timestamp,
        ended_at timestamp,
        duration integer,
        summary text,
        conclusion text,
        sentiment varchar(50),
        business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS call_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        speaker speaker_type_enum NOT NULL,
        message text NOT NULL,
        sequence_number integer NOT NULL DEFAULT 0,
        occurred_at timestamp,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS call_recordings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        recording_url text NOT NULL,
        storage_provider varchar(50) NOT NULL DEFAULT 'twilio',
        duration integer,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS email_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        sent_to varchar(200) NOT NULL,
        status email_status_enum NOT NULL DEFAULT 'pending',
        error_message text,
        sent_at timestamp,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ai_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        model_name varchar(100) NOT NULL DEFAULT 'gpt-realtime',
        voice varchar(50) NOT NULL DEFAULT 'alloy',
        language varchar(20) NOT NULL DEFAULT 'en',
        system_prompt text NOT NULL,
        temperature double precision NOT NULL DEFAULT 0.7,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS call_provider_mappings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        provider varchar(50) NOT NULL,
        external_call_id varchar(150) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_call_provider_mapping UNIQUE (provider, external_call_id)
      );

      CREATE TABLE IF NOT EXISTS provider_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
        provider varchar(50) NOT NULL,
        external_event_id varchar(150) NOT NULL,
        event_type varchar(100) NOT NULL,
        payload_hash varchar(64) NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_provider_event UNIQUE (provider, external_event_id)
      );

      -- Reconcile TypeORM's former default camelCase relation columns without
      -- deleting them. A later, separately reviewed migration may remove them.
      ALTER TABLE calls ADD COLUMN IF NOT EXISTS business_id uuid;
      ALTER TABLE call_messages ADD COLUMN IF NOT EXISTS call_id uuid;
      ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS call_id uuid;
      ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS call_id uuid;
      ALTER TABLE ai_configs ADD COLUMN IF NOT EXISTS business_id uuid;

      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'calls' AND column_name = 'businessId'
        ) THEN
          EXECUTE 'UPDATE calls SET business_id = "businessId" WHERE business_id IS NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'call_messages' AND column_name = 'callId'
        ) THEN
          EXECUTE 'UPDATE call_messages SET call_id = "callId" WHERE call_id IS NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'call_recordings' AND column_name = 'callId'
        ) THEN
          EXECUTE 'UPDATE call_recordings SET call_id = "callId" WHERE call_id IS NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'email_logs' AND column_name = 'callId'
        ) THEN
          EXECUTE 'UPDATE email_logs SET call_id = "callId" WHERE call_id IS NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'ai_configs' AND column_name = 'businessId'
        ) THEN
          EXECUTE 'UPDATE ai_configs SET business_id = "businessId" WHERE business_id IS NULL';
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calls_business') THEN
          ALTER TABLE calls ADD CONSTRAINT fk_calls_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_messages_call') THEN
          ALTER TABLE call_messages ADD CONSTRAINT fk_call_messages_call
            FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_recordings_call') THEN
          ALTER TABLE call_recordings ADD CONSTRAINT fk_call_recordings_call
            FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_logs_call') THEN
          ALTER TABLE email_logs ADD CONSTRAINT fk_email_logs_call
            FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_configs_business') THEN
          ALTER TABLE ai_configs ADD CONSTRAINT fk_ai_configs_business
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_call_messages_call_sequence ON call_messages(call_id, sequence_number);
      CREATE INDEX IF NOT EXISTS idx_provider_events_received_at ON provider_events(received_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS provider_events;
      DROP TABLE IF EXISTS call_provider_mappings;
      DROP TABLE IF EXISTS ai_configs;
      DROP TABLE IF EXISTS email_logs;
      DROP TABLE IF EXISTS call_recordings;
      DROP TABLE IF EXISTS call_messages;
      DROP TABLE IF EXISTS calls;
      DROP TABLE IF EXISTS businesses;
      DROP TYPE IF EXISTS email_status_enum;
      DROP TYPE IF EXISTS speaker_type_enum;
      DROP TYPE IF EXISTS call_status_enum;
    `);
  }
}
