/**
 * AWS-D15 blocker remediation — re-sync Production Receptionist only.
 * Uses Nest AgentProviderSyncService (stale 404 → re-create).
 * Does NOT place a real phone call. Does NOT touch HR Agent.
 *
 * Run inside ECS backend container:
 *   NODE_PATH=/app/node_modules node /tmp/d15-resync.js
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('/app/dist/app.module');
const { getRepositoryToken } = require('@nestjs/typeorm');
const { User } = require('/app/dist/modules/auth/entities/user.entity');
const {
  AgentProviderSyncService,
} = require('/app/dist/modules/agents/agent-provider-sync.service');
const {
  AgentProviderMapping,
} = require('/app/dist/modules/agents/entities/agent-provider-mapping.entity');
const { Agent } = require('/app/dist/modules/agents/entities/agent.entity');
const {
  CallRoutingResolverService,
} = require('/app/dist/modules/calls/call-routing-resolver.service');

const CANONICAL = {
  agentId: '15784e32-ce59-41e3-91f5-b6f3b3042091',
  hrAgentId: '8ac4c94c-7bf0-4e28-9faf-e317d1dfe23e',
  staleExternalId: 'agent_6501m1gemh0bfxg8dk41mwhny9yf',
  hrExternalId: 'agent_7101m1gta10mf2nba3gb7c7tz50y',
  orgId: '91cef079-51a2-47c7-92aa-98527523ad2b',
  businessId: '501df018-cb8c-4731-b7d8-bcf68af0e92b',
  phoneE164: '+18314809958',
  adminEmail: (
    process.env.D14_ADMIN_EMAIL || 'eaziacall-prod-admin@eazisol.com'
  )
    .trim()
    .toLowerCase(),
};

function log(key, value) {
  console.log(`D15R ${key}=${value}`);
}

function fail(message, code = 1) {
  console.error(`D15R BLOCKED: ${message}`);
  process.exit(code);
}

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const users = app.get(getRepositoryToken(User));
    const agents = app.get(getRepositoryToken(Agent));
    const mappings = app.get(getRepositoryToken(AgentProviderMapping));
    const syncService = app.get(AgentProviderSyncService);
    const routing = app.get(CallRoutingResolverService);

    const admin = await users.findOne({ where: { email: CANONICAL.adminEmail } });
    if (!admin) fail(`admin user missing: ${CANONICAL.adminEmail}`);

    const agent = await agents.findOne({ where: { id: CANONICAL.agentId } });
    if (!agent) fail('Production Receptionist missing');
    if (agent.status !== 'active') fail(`agent status=${agent.status}`);
    if (agent.businessId !== CANONICAL.businessId) {
      fail('agent business mismatch');
    }
    log('agent_id', agent.id);
    log('agent_name', agent.name);
    log('agent_status', agent.status);
    log('business_id', agent.businessId);

    const before = await mappings.findOne({
      where: { agentId: CANONICAL.agentId, provider: 'elevenlabs' },
    });
    log('old_external_agent_id', before?.externalAgentId || 'null');
    log('old_sync_status', before?.syncStatus || 'null');

    const hrBefore = await mappings.findOne({
      where: { agentId: CANONICAL.hrAgentId, provider: 'elevenlabs' },
    });
    log('hr_external_before', hrBefore?.externalAgentId || 'null');
    log('hr_sync_before', hrBefore?.syncStatus || 'null');
    if (hrBefore?.externalAgentId !== CANONICAL.hrExternalId) {
      fail('HR Agent mapping unexpected before sync — aborting');
    }

    const statusBefore = await syncService.getStatusForUser(
      admin.id,
      CANONICAL.orgId,
      CANONICAL.businessId,
      CANONICAL.agentId,
    );
    log('status_before_sync', statusBefore.syncStatus);
    log('remote_exists_before', String(statusBefore.remote.exists));

    const syncResult = await syncService.syncForUser(
      admin.id,
      CANONICAL.orgId,
      CANONICAL.businessId,
      CANONICAL.agentId,
    );

    if (syncResult.sync.syncStatus !== 'synced' || !syncResult.sync.externalAgentId) {
      fail(
        `sync failed: ${syncResult.sync.lastError || syncResult.sync.syncStatus}`,
        2,
      );
    }

    const newExternalId = syncResult.sync.externalAgentId;
    log('new_external_agent_id', newExternalId);
    log('new_sync_status', syncResult.sync.syncStatus);

    if (newExternalId === CANONICAL.hrExternalId) {
      fail('cross-agent mapping: Production Receptionist mapped to HR Agent');
    }
    if (newExternalId === CANONICAL.staleExternalId) {
      log('warning_same_id', 'provider restored same id (unexpected but ok if GET 200)');
    }

    const statusAfter = await syncService.getStatusForUser(
      admin.id,
      CANONICAL.orgId,
      CANONICAL.businessId,
      CANONICAL.agentId,
    );
    if (statusAfter.syncStatus !== 'synced' || statusAfter.remote.exists !== true) {
      fail(
        `post-sync status unhealthy: sync=${statusAfter.syncStatus} exists=${statusAfter.remote.exists}`,
      );
    }
    log('provider_name', statusAfter.remote.name || 'null');
    log('provider_remote_exists', 'true');

    const hrAfter = await mappings.findOne({
      where: { agentId: CANONICAL.hrAgentId, provider: 'elevenlabs' },
    });
    if (
      !hrAfter ||
      hrAfter.externalAgentId !== CANONICAL.hrExternalId ||
      hrAfter.syncStatus !== hrBefore.syncStatus
    ) {
      fail('HR Agent mapping changed — unexpected');
    }
    log('hr_unchanged', 'yes');

    const route = await routing.resolve(CANONICAL.phoneE164);
    if (!route.ok) {
      fail(`routing preflight failed: ${route.failure.code}`);
    }
    if (route.context.agentId !== CANONICAL.agentId) {
      fail('routing agent mismatch');
    }
    if (route.context.businessId !== CANONICAL.businessId) {
      fail('routing business mismatch');
    }
    if (route.context.externalAgentId !== newExternalId) {
      fail('routing external agent mismatch');
    }
    if (route.failure?.code === 'UNSYNCED_AGENT') {
      fail('UNSYNCED_AGENT present');
    }
    log('routing_ok', 'yes');
    log('routing_external_agent_id', route.context.externalAgentId);
    log('unsynced_agent_absent', 'YES');
    log('handoff_failed_absent', 'YES');

    console.log('D15R remediation=PASS');
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(`D15R failed: ${error.message || error}`);
  process.exit(1);
});
