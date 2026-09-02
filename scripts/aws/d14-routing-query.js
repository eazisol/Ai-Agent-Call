const { Client } = require('pg');

const ELEVENLABS_PROVIDER = 'elevenlabs';

function maskPhone(e164) {
  if (!e164 || e164.length < 6) return '***';
  const prefixLen = e164.startsWith('+1') && e164.length >= 11 ? 4 : 3;
  return `${e164.slice(0, prefixLen)}***${e164.slice(-4)}`;
}

(async () => {
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

  const phones = await client.query(`
    SELECT
      pn.id,
      pn.business_id,
      pn.provider,
      pn.provider_number_id,
      pn.phone_number_e164,
      pn.status,
      pn.friendly_name,
      b.name AS business_name,
      b.status AS business_status
    FROM phone_numbers pn
    JOIN businesses b ON b.id = pn.business_id
    WHERE pn.status = 'active'
      AND pn.provider = 'twilio'
    ORDER BY pn.created_at ASC
  `);

  console.log(`D14 active_twilio_numbers=${phones.rowCount}`);

  if (phones.rowCount === 0) {
    console.error('D14 BLOCKED: no active Twilio phone numbers in database');
    process.exit(2);
  }

  if (phones.rowCount > 1) {
    console.error('D14 BLOCKED: multiple active Twilio phone numbers; ambiguous canonical assignment');
    for (const row of phones.rows) {
      console.log(
        `D14 candidate id=${row.id} phone=${maskPhone(row.phone_number_e164)} sid=${row.provider_number_id || 'null'} business=${row.business_name}`,
      );
    }
    process.exit(3);
  }

  const phone = phones.rows[0];
  console.log(`D14 canonical_phone_id=${phone.id}`);
  console.log(`D14 canonical_phone_masked=${maskPhone(phone.phone_number_e164)}`);
  console.log(`D14 canonical_provider_sid=${phone.provider_number_id || 'null'}`);
  console.log(`D14 business_id=${phone.business_id}`);
  console.log(`D14 business_name=${phone.business_name}`);
  console.log(`D14 business_status=${phone.business_status}`);

  if (phone.business_status !== 'active') {
    console.error('D14 BLOCKED: business is not active');
    process.exit(4);
  }

  const assignment = await client.query(
    `
    SELECT pna.id, pna.agent_id, pna.status
    FROM phone_number_assignments pna
    WHERE pna.phone_number_id = $1 AND pna.status = 'active'
    LIMIT 2
  `,
    [phone.id],
  );

  if (assignment.rowCount === 0) {
    console.error('D14 BLOCKED: no active agent assignment');
    process.exit(5);
  }
  if (assignment.rowCount > 1) {
    console.error('D14 BLOCKED: multiple active agent assignments');
    process.exit(6);
  }

  const agentId = assignment.rows[0].agent_id;
  console.log(`D14 agent_id=${agentId}`);

  const agent = await client.query(
    `SELECT id, business_id, name, status FROM ai_agents WHERE id = $1`,
    [agentId],
  );
  if (agent.rowCount === 0 || agent.rows[0].status !== 'active') {
    console.error('D14 BLOCKED: assigned agent missing or inactive');
    process.exit(7);
  }
  if (agent.rows[0].business_id !== phone.business_id) {
    console.error('D14 BLOCKED: cross-business agent assignment');
    process.exit(8);
  }
  console.log(`D14 agent_name=${agent.rows[0].name}`);
  console.log(`D14 agent_status=${agent.rows[0].status}`);

  const agentMapping = await client.query(
    `
    SELECT external_agent_id, sync_status
    FROM agent_provider_mappings
    WHERE agent_id = $1 AND provider = $2
    LIMIT 1
  `,
    [agentId, ELEVENLABS_PROVIDER],
  );
  if (
    agentMapping.rowCount === 0 ||
    agentMapping.rows[0].sync_status !== 'synced' ||
    !agentMapping.rows[0].external_agent_id
  ) {
    console.error('D14 BLOCKED: ElevenLabs agent provider mapping not synced');
    process.exit(9);
  }
  console.log(
    `D14 elevenlabs_external_agent_id=${agentMapping.rows[0].external_agent_id}`,
  );

  const voiceConfig = await client.query(
    `SELECT voice_id FROM agent_configs WHERE agent_id = $1 LIMIT 1`,
    [agentId],
  );
  const voiceId = voiceConfig.rows[0]?.voice_id ?? null;
  if (!voiceId) {
    console.log('D14 voice_optional=yes');
    console.log('D14 voice_ready=yes');
  } else {
    const voice = await client.query(
      `
      SELECT va.id, va.status, vpm.external_voice_id, vpm.sync_status
      FROM voice_assets va
      LEFT JOIN voice_provider_mappings vpm
        ON vpm.voice_asset_id = va.id AND vpm.provider = $2
      WHERE va.id = $1
      LIMIT 1
    `,
      [voiceId, ELEVENLABS_PROVIDER],
    );
    if (voice.rowCount === 0 || voice.rows[0].status !== 'active') {
      console.error('D14 BLOCKED: assigned voice not active');
      process.exit(10);
    }
    console.log(`D14 voice_asset_id=${voice.rows[0].id}`);
    console.log(
      `D14 voice_external_id=${voice.rows[0].external_voice_id || 'null'}`,
    );
    console.log(`D14 voice_sync_status=${voice.rows[0].sync_status || 'null'}`);
    console.log('D14 voice_ready=yes');
  }

  const knowledge = await client.query(
    `
    SELECT
      COUNT(*)::int AS active_sources,
      COUNT(*) FILTER (
        WHERE ks.status = 'active'
          AND kpm.sync_status = 'synced'
          AND kpm.external_source_id IS NOT NULL
      )::int AS synced_sources
    FROM agent_knowledge_sources aks
    JOIN knowledge_sources ks ON ks.id = aks.knowledge_source_id
    LEFT JOIN knowledge_provider_mappings kpm
      ON kpm.knowledge_source_id = ks.id AND kpm.provider = $2
    WHERE aks.agent_id = $1
  `,
    [agentId, ELEVENLABS_PROVIDER],
  );
  console.log(
    `D14 knowledge_active=${knowledge.rows[0].active_sources} synced=${knowledge.rows[0].synced_sources}`,
  );
  if (
    Number(knowledge.rows[0].active_sources) > 0 &&
    Number(knowledge.rows[0].synced_sources) !==
      Number(knowledge.rows[0].active_sources)
  ) {
    console.error('D14 BLOCKED: assigned knowledge not fully synced');
    process.exit(11);
  }
  console.log('D14 knowledge_ready=yes');

  const callCount = await client.query(`SELECT COUNT(*)::int AS n FROM calls`);
  console.log(`D14 call_count=${callCount.rows[0].n}`);

  await client.end();
  console.log('D14 routing_query=PASS');
})().catch((error) => {
  console.error(`D14 routing query failed: ${error.message}`);
  process.exit(1);
});
