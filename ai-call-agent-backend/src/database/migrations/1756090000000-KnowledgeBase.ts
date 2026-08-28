import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M07 Knowledge Base: Business-owned knowledge_sources + agent assignments +
 * provider mappings. No knowledge_bases table (Business is the library container).
 * No knowledge_sync_logs (mapping-only MVP). No organization_id on these tables.
 */
export class KnowledgeBase1756090000000 implements MigrationInterface {
  name = 'KnowledgeBase1756090000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name varchar(200) NOT NULL,
        type varchar(20) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        description text,
        language varchar(20),
        url text,
        text_body text,
        faq_items jsonb,
        object_key varchar(1024),
        original_filename varchar(255),
        content_type varchar(150),
        byte_size integer,
        content_hash varchar(64),
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_knowledge_sources_type CHECK (
          type IN ('file', 'url', 'text', 'faq')
        ),
        CONSTRAINT chk_knowledge_sources_status CHECK (
          status IN ('active', 'archived')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_sources_business_id_status
        ON knowledge_sources(business_id, status);

      CREATE TABLE IF NOT EXISTS agent_knowledge_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
        knowledge_source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_agent_knowledge_sources_agent_source
          UNIQUE (agent_id, knowledge_source_id)
      );

      CREATE INDEX IF NOT EXISTS idx_agent_knowledge_sources_agent_id
        ON agent_knowledge_sources(agent_id);

      CREATE INDEX IF NOT EXISTS idx_agent_knowledge_sources_source_id
        ON agent_knowledge_sources(knowledge_source_id);

      CREATE TABLE IF NOT EXISTS knowledge_provider_mappings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        knowledge_source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
        provider varchar(50) NOT NULL,
        external_source_id varchar(255),
        sync_status varchar(40) NOT NULL DEFAULT 'not_provisioned',
        last_synced_at timestamptz,
        last_synced_version integer,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_knowledge_provider_mappings_source_provider
          UNIQUE (knowledge_source_id, provider),
        CONSTRAINT chk_knowledge_provider_mappings_sync_status CHECK (
          sync_status IN ('not_provisioned', 'pending', 'synced', 'error')
        )
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_provider_mappings_source_id
        ON knowledge_provider_mappings(knowledge_source_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS knowledge_provider_mappings;
      DROP TABLE IF EXISTS agent_knowledge_sources;
      DROP TABLE IF EXISTS knowledge_sources;
    `);
  }
}
