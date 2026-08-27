import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SaaS voice agents. Table is `ai_agents` (not `agents`) because this database
 * also hosts n8n, which already owns a public.`agents` table.
 */
export class AiAgentManagement1756080000000 implements MigrationInterface {
  name = 'AiAgentManagement1756080000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name varchar(150) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_ai_agents_status CHECK (status IN ('active', 'inactive', 'archived'))
      );

      CREATE INDEX IF NOT EXISTS idx_ai_agents_business_id_status
        ON ai_agents(business_id, status);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_agents_business_lower_name_non_archived
        ON ai_agents (business_id, lower(name))
        WHERE status <> 'archived';

      CREATE TABLE IF NOT EXISTS agent_configs (
        agent_id uuid PRIMARY KEY REFERENCES ai_agents(id) ON DELETE CASCADE,
        language varchar(20) NOT NULL DEFAULT 'en',
        escalation_enabled boolean NOT NULL DEFAULT false,
        escalation_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
        escalation_contact_phone varchar(30),
        escalation_contact_email varchar(150),
        escalation_message text,
        voice_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_agent_configs_language CHECK (
          language IN ('en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'ur')
        )
      );

      CREATE TABLE IF NOT EXISTS agent_prompts (
        agent_id uuid PRIMARY KEY REFERENCES ai_agents(id) ON DELETE CASCADE,
        role_label varchar(100) NOT NULL,
        personality text,
        greeting text NOT NULL,
        instructions text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS agent_provider_mappings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
        provider varchar(50) NOT NULL,
        external_agent_id varchar(255),
        sync_status varchar(40) NOT NULL DEFAULT 'not_provisioned',
        last_synced_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_agent_provider_mappings_agent_provider UNIQUE (agent_id, provider),
        CONSTRAINT chk_agent_provider_mappings_sync_status CHECK (
          sync_status IN ('not_provisioned', 'pending', 'synced', 'error')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_agent_provider_mappings_agent_id
        ON agent_provider_mappings(agent_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS agent_provider_mappings;
      DROP TABLE IF EXISTS agent_prompts;
      DROP TABLE IF EXISTS agent_configs;
      DROP TABLE IF EXISTS ai_agents;
    `);
  }
}
