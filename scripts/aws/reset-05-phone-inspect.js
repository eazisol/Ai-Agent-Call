/**
 * RESET-05 — Read-only phone + assignment + routing readiness inspection.
 */
const { Client } = require('pg');

const EXPECTED_E164 = process.env.RESET05_E164 || '+18314809958';
const EXPECTED_SID =
  process.env.RESET05_PHONE_SID || 'PN80a9e2d52f491f05ff461b523359eec0';
const OLD_SID =
  process.env.RESET05_OLD_SID || 'PN955403bd40b0708ec33ab960a1b7886b';
const EXPECTED_BIZ =
  process.env.RESET05_BUSINESS_ID || '3c0680ed-320d-48ae-bf57-c129c03676b1';
const EXPECTED_AGENT =
  process.env.RESET05_AGENT_ID || '12d9775c-4939-402c-84e0-ffae1e6da207';
const EXPECTED_EL =
  process.env.RESET05_EL_AGENT || 'agent_5801m1k86tc7ewdbtq36s94dfw6d';

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
  console.log('RESET05 inspect_start=yes');

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM organizations) AS organizations,
      (SELECT COUNT(*)::int FROM organization_members) AS memberships,
      (SELECT COUNT(*)::int FROM businesses) AS businesses,
      (SELECT COUNT(*)::int FROM ai_agents) AS agents,
      (SELECT COUNT(*)::int FROM agent_provider_mappings) AS agent_provider_mappings,
      (SELECT COUNT(*)::int FROM phone_numbers) AS phone_numbers,
      (SELECT COUNT(*)::int FROM phone_number_assignments) AS phone_assignments,
      (SELECT COUNT(*)::int FROM telephony_provider_mappings) AS telephony_mappings,
      (SELECT COUNT(*)::int FROM calls) AS calls,
      (SELECT COUNT(*)::int FROM call_events) AS call_events,
      (SELECT COUNT(*)::int FROM eazi_ai_call_migrations) AS migrations
  `);
  for (const [k, v] of Object.entries(counts.rows[0])) {
    console.log(`RESET05 count_${k}=${v}`);
  }

  const oldRefs = await client.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM phone_numbers WHERE provider_number_id = $1) AS phones,
      (SELECT COUNT(*)::int FROM telephony_provider_mappings WHERE external_resource_id = $1) AS telephony
  `,
    [OLD_SID],
  );
  console.log(
    `RESET05 old_sid_phone_refs=${oldRefs.rows[0].phones} telephony_refs=${oldRefs.rows[0].telephony}`,
  );

  const phones = await client.query(`
    SELECT
      pn.id::text,
      pn.phone_number_e164,
      pn.provider,
      pn.provider_number_id,
      pn.status,
      pn.friendly_name,
      pn.business_id::text,
      b.name AS business_name,
      b.status AS business_status
    FROM phone_numbers pn
    JOIN businesses b ON b.id = pn.business_id
    ORDER BY pn.created_at ASC
  `);
  for (const p of phones.rows) {
    console.log(
      `RESET05 phone id=${p.id} e164=${p.phone_number_e164} provider=${p.provider} sid=${p.provider_number_id || 'null'} status=${p.status} friendly=${JSON.stringify(p.friendly_name)} business_id=${p.business_id} business=${JSON.stringify(p.business_name)} business_status=${p.business_status}`,
    );
  }

  const phone = phones.rows.find(
    (p) =>
      p.phone_number_e164 === EXPECTED_E164 &&
      p.provider_number_id === EXPECTED_SID,
  );
  console.log(`RESET05 canonical_phone_found=${phone ? 'yes' : 'no'}`);
  if (phone) {
    console.log(`RESET05 canonical_phone_id=${phone.id}`);
    console.log(
      `RESET05 phone_business_ok=${phone.business_id === EXPECTED_BIZ ? 'yes' : 'no'}`,
    );
    console.log(
      `RESET05 phone_active=${phone.status === 'active' ? 'yes' : 'no'}`,
    );
  }

  const assigns = await client.query(`
    SELECT
      pna.id::text,
      pna.phone_number_id::text,
      pna.agent_id::text,
      pna.status,
      a.name AS agent_name,
      a.status AS agent_status
    FROM phone_number_assignments pna
    JOIN ai_agents a ON a.id = pna.agent_id
    ORDER BY pna.created_at ASC
  `);
  for (const a of assigns.rows) {
    console.log(
      `RESET05 assignment id=${a.id} phone_id=${a.phone_number_id} agent_id=${a.agent_id} agent=${JSON.stringify(a.agent_name)} assign_status=${a.status} agent_status=${a.agent_status}`,
    );
  }

  const activeAssign = assigns.rows.filter(
    (a) => phone && a.phone_number_id === phone.id && a.status === 'active',
  );
  console.log(`RESET05 active_assignments_for_phone=${activeAssign.length}`);
  if (activeAssign.length === 1) {
    console.log(
      `RESET05 assign_agent_ok=${activeAssign[0].agent_id === EXPECTED_AGENT ? 'yes' : 'no'}`,
    );
  }

  const agentMap = await client.query(
    `
    SELECT external_agent_id, sync_status
    FROM agent_provider_mappings
    WHERE agent_id = $1 AND provider = 'elevenlabs'
    LIMIT 1
  `,
    [EXPECTED_AGENT],
  );
  if (agentMap.rowCount > 0) {
    console.log(
      `RESET05 el_external=${agentMap.rows[0].external_agent_id || 'null'} sync=${agentMap.rows[0].sync_status}`,
    );
    console.log(
      `RESET05 el_ok=${
        agentMap.rows[0].external_agent_id === EXPECTED_EL &&
        agentMap.rows[0].sync_status === 'synced'
          ? 'yes'
          : 'no'
      }`,
    );
  } else {
    console.log('RESET05 el_ok=no');
  }

  // Routing preflight (DB-level, same resolution shape as CallRoutingResolver)
  if (phone && activeAssign.length === 1) {
    console.log('RESET05 routing_phone=' + phone.phone_number_e164);
    console.log('RESET05 routing_business=' + phone.business_id);
    console.log('RESET05 routing_agent=' + activeAssign[0].agent_id);
    console.log(
      'RESET05 routing_el=' + (agentMap.rows[0]?.external_agent_id || 'null'),
    );
    console.log(
      `RESET05 routing_ok=${
        phone.business_id === EXPECTED_BIZ &&
        activeAssign[0].agent_id === EXPECTED_AGENT &&
        agentMap.rows[0]?.external_agent_id === EXPECTED_EL &&
        agentMap.rows[0]?.sync_status === 'synced' &&
        phone.status === 'active'
          ? 'yes'
          : 'no'
      }`,
    );
  } else {
    console.log('RESET05 routing_ok=no');
  }

  console.log(
    `RESET05 calls_zero=${Number(counts.rows[0].calls) === 0 && Number(counts.rows[0].call_events) === 0 ? 'yes' : 'no'}`,
  );

  await client.end();
  console.log('RESET05 inspect=PASS');
})().catch((error) => {
  console.error(`RESET05 inspect failed: ${error.message}`);
  process.exit(1);
});
