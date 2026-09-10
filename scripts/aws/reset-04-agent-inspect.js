/**
 * RESET-04 — Read-only agent/voice/knowledge/provider mapping inspection.
 * Does not print secrets or full prompt text.
 */
const { Client } = require('pg');

const FORBIDDEN_EXTERNAL = new Set([
  'agent_7101m1gta10mf2nba3gb7c7tz50y',
  'agent_6501m1gemh0bfxg8dk41mwhny9yf',
]);

(async () => {
  const expectedBiz =
    process.env.RESET04_BUSINESS_ID ||
    '3c0680ed-320d-48ae-bf57-c129c03676b1';

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number.parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  console.log('RESET04 inspect_start=yes');

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM organizations) AS organizations,
      (SELECT COUNT(*)::int FROM organization_members) AS memberships,
      (SELECT COUNT(*)::int FROM businesses) AS businesses,
      (SELECT COUNT(*)::int FROM ai_agents) AS agents,
      (SELECT COUNT(*)::int FROM agent_configs) AS agent_configs,
      (SELECT COUNT(*)::int FROM agent_prompts) AS agent_prompts,
      (SELECT COUNT(*)::int FROM agent_provider_mappings) AS agent_provider_mappings,
      (SELECT COUNT(*)::int FROM knowledge_sources) AS knowledge_sources,
      (SELECT COUNT(*)::int FROM knowledge_provider_mappings) AS knowledge_provider_mappings,
      (SELECT COUNT(*)::int FROM agent_knowledge_sources) AS agent_knowledge_sources,
      (SELECT COUNT(*)::int FROM voice_assets) AS voice_assets,
      (SELECT COUNT(*)::int FROM voice_provider_mappings) AS voice_provider_mappings,
      (SELECT COUNT(*)::int FROM phone_numbers) AS phone_numbers,
      (SELECT COUNT(*)::int FROM phone_number_assignments) AS phone_assignments,
      (SELECT COUNT(*)::int FROM calls) AS calls,
      (SELECT COUNT(*)::int FROM call_events) AS call_events,
      (SELECT COUNT(*)::int FROM eazi_ai_call_migrations) AS migrations
  `);
  for (const [k, v] of Object.entries(counts.rows[0])) {
    console.log(`RESET04 count_${k}=${v}`);
  }

  const agents = await client.query(
    `
    SELECT
      a.id::text,
      a.name,
      a.status,
      a.business_id::text,
      b.name AS business_name,
      ap.role_label,
      (ap.greeting IS NOT NULL AND length(trim(ap.greeting)) > 0) AS has_greeting,
      (ap.instructions IS NOT NULL AND length(trim(ap.instructions)) > 0) AS has_instructions,
      length(ap.greeting) AS greeting_len,
      length(ap.instructions) AS instructions_len,
      ac.language,
      ac.language_mode,
      ac.use_business_language_settings,
      ac.voice_id::text,
      ac.voice_preference
    FROM ai_agents a
    JOIN businesses b ON b.id = a.business_id
    LEFT JOIN agent_prompts ap ON ap.agent_id = a.id
    LEFT JOIN agent_configs ac ON ac.agent_id = a.id
    ORDER BY a.created_at ASC
  `,
  );

  for (const a of agents.rows) {
    console.log(
      `RESET04 agent id=${a.id} name=${JSON.stringify(a.name)} status=${a.status} business_id=${a.business_id} business=${JSON.stringify(a.business_name)} role=${JSON.stringify(a.role_label)} has_greeting=${a.has_greeting ? 'yes' : 'no'} has_instructions=${a.has_instructions ? 'yes' : 'no'} greeting_len=${a.greeting_len} instructions_len=${a.instructions_len} language=${a.language} language_mode=${a.language_mode} use_biz_lang=${a.use_business_language_settings} voice_id=${a.voice_id || 'null'} voice_pref=${a.voice_preference || 'null'}`,
    );
  }

  const production = agents.rows.find(
    (a) =>
      String(a.name) === 'Production Receptionist' &&
      a.business_id === expectedBiz,
  );
  console.log(
    `RESET04 production_receptionist_found=${production ? 'yes' : 'no'}`,
  );
  if (production) {
    console.log(`RESET04 production_agent_id=${production.id}`);
    console.log(
      `RESET04 production_active=${production.status === 'active' ? 'yes' : 'no'}`,
    );
  }

  if (production?.voice_id) {
    const voice = await client.query(
      `
      SELECT
        va.id::text,
        va.display_name,
        va.status,
        va.source_type,
        vpm.external_voice_id
      FROM voice_assets va
      LEFT JOIN voice_provider_mappings vpm
        ON vpm.voice_asset_id = va.id AND vpm.provider = 'elevenlabs'
      WHERE va.id = $1
      LIMIT 1
    `,
      [production.voice_id],
    );
    if (voice.rowCount > 0) {
      const v = voice.rows[0];
      console.log(
        `RESET04 voice id=${v.id} name=${JSON.stringify(v.display_name)} status=${v.status} source=${v.source_type} external_voice_id=${v.external_voice_id || 'null'}`,
      );
    }
  }

  const knowledge = await client.query(`
    SELECT
      ks.id::text,
      ks.name,
      ks.status,
      ks.type,
      ks.business_id::text,
      kpm.external_source_id,
      kpm.sync_status AS knowledge_sync
    FROM knowledge_sources ks
    LEFT JOIN knowledge_provider_mappings kpm
      ON kpm.knowledge_source_id = ks.id AND kpm.provider = 'elevenlabs'
    ORDER BY ks.created_at ASC
  `);
  for (const k of knowledge.rows) {
    console.log(
      `RESET04 knowledge id=${k.id} name=${JSON.stringify(k.name)} status=${k.status} type=${k.type} business_id=${k.business_id} external_source_id=${k.external_source_id || 'null'} knowledge_sync=${k.knowledge_sync || 'null'}`,
    );
  }

  if (production) {
    const assigns = await client.query(
      `
      SELECT aks.knowledge_source_id::text, ks.name
      FROM agent_knowledge_sources aks
      JOIN knowledge_sources ks ON ks.id = aks.knowledge_source_id
      WHERE aks.agent_id = $1
    `,
      [production.id],
    );
    console.log(`RESET04 agent_knowledge_assign_count=${assigns.rowCount}`);
    for (const row of assigns.rows) {
      console.log(
        `RESET04 agent_knowledge knowledge_id=${row.knowledge_source_id} name=${JSON.stringify(row.name)}`,
      );
    }
  }

  const mappings = await client.query(`
    SELECT
      apm.id::text,
      apm.agent_id::text,
      a.name AS agent_name,
      apm.provider,
      apm.external_agent_id,
      apm.sync_status,
      apm.last_synced_at,
      (apm.last_error IS NOT NULL AND length(apm.last_error) > 0) AS has_error
    FROM agent_provider_mappings apm
    JOIN ai_agents a ON a.id = apm.agent_id
    ORDER BY apm.created_at ASC
  `);
  for (const m of mappings.rows) {
    console.log(
      `RESET04 mapping id=${m.id} agent_id=${m.agent_id} agent_name=${JSON.stringify(m.agent_name)} provider=${m.provider} external_agent_id=${m.external_agent_id || 'null'} sync_status=${m.sync_status} last_synced_at=${m.last_synced_at ? m.last_synced_at.toISOString() : 'null'} has_error=${m.has_error ? 'yes' : 'no'}`,
    );
    if (
      m.external_agent_id &&
      FORBIDDEN_EXTERNAL.has(String(m.external_agent_id))
    ) {
      console.log(
        `RESET04 forbidden_external_id=yes id=${m.external_agent_id}`,
      );
    }
  }

  const prodMap = mappings.rows.find(
    (m) => production && m.agent_id === production.id && m.provider === 'elevenlabs',
  );
  console.log(`RESET04 production_mapping_found=${prodMap ? 'yes' : 'no'}`);
  if (prodMap) {
    console.log(`RESET04 production_external_agent_id=${prodMap.external_agent_id || 'null'}`);
    console.log(`RESET04 production_sync_status=${prodMap.sync_status}`);
    console.log(
      `RESET04 production_external_unique_ok=${
        prodMap.external_agent_id &&
        !FORBIDDEN_EXTERNAL.has(String(prodMap.external_agent_id))
          ? 'yes'
          : 'no'
      }`,
    );
  }

  console.log(
    `RESET04 phones_zero=${Number(counts.rows[0].phone_numbers) === 0 ? 'yes' : 'no'}`,
  );
  console.log(
    `RESET04 calls_zero=${Number(counts.rows[0].calls) === 0 && Number(counts.rows[0].call_events) === 0 ? 'yes' : 'no'}`,
  );

  await client.end();
  console.log('RESET04 inspect=PASS');
})().catch((error) => {
  console.error(`RESET04 inspect failed: ${error.message}`);
  process.exit(1);
});
