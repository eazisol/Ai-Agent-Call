/**
 * AWS-D14 tenant routing remediation — uses NestJS services (not raw SQL).
 * Runs inside ECS backend container: NODE_PATH=/app/node_modules node /tmp/d14-provision.js
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('/app/dist/app.module');
const { PasswordService } = require('/app/dist/modules/auth/password.service');
const { User } = require('/app/dist/modules/auth/entities/user.entity');
const { Organization } = require('/app/dist/modules/organizations/entities/organization.entity');
const { OrganizationsService } = require('/app/dist/modules/organizations/organizations.service');
const { BusinessesService } = require('/app/dist/modules/businesses/businesses.service');
const { AgentsService } = require('/app/dist/modules/agents/agents.service');
const {
  AgentProviderSyncService,
} = require('/app/dist/modules/agents/agent-provider-sync.service');
const {
  PhoneNumbersService,
} = require('/app/dist/modules/phone-numbers/phone-numbers.service');
const { PhoneNumber } = require('/app/dist/modules/phone-numbers/entities/phone-number.entity');
const {
  PhoneNumberAssignment,
} = require('/app/dist/modules/phone-numbers/entities/phone-number-assignment.entity');
const { Agent } = require('/app/dist/modules/agents/entities/agent.entity');
const { Business } = require('/app/dist/modules/businesses/entities/business.entity');
const {
  AgentProviderMapping,
} = require('/app/dist/modules/agents/entities/agent-provider-mapping.entity');
const { getRepositoryToken } = require('@nestjs/typeorm');

const CANONICAL = {
  orgName: 'EaziAICall Production',
  orgSlug: 'eaziacall-production',
  businessName: 'EaziAICall Production Line',
  agentName: 'Production Receptionist',
  phoneE164: '+18314809958',
  twilioSid: 'PN955403bd40b0708ec33ab960a1b7886b',
  adminDisplayName: 'EaziAICall Production Admin',
};

function log(key, value) {
  console.log(`D14 provision ${key}=${value}`);
}

function fail(message, code = 1) {
  console.error(`D14 provision BLOCKED: ${message}`);
  process.exit(code);
}

async function ensureAdminUser(app, email, password) {
  const users = app.get(getRepositoryToken(User));
  const passwords = app.get(PasswordService);

  let user = await users.findOne({ where: { email } });
  if (!user) {
    if (!password || password.length < 12) {
      fail('D14_BOOTSTRAP_PASSWORD must be at least 12 characters for new admin user');
    }
    const passwordHash = await passwords.hash(password);
    user = await users.save(
      users.create({
        email,
        passwordHash,
        displayName: CANONICAL.adminDisplayName,
        emailVerifiedAt: new Date(),
      }),
    );
    log('admin_created', 'yes');
  } else if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await users.save(user);
    log('admin_verified', 'yes');
  } else {
    log('admin_reused', 'yes');
  }

  log('admin_user_id', user.id);
  return user.id;
}

async function findCanonicalOrg(orgRepo) {
  return orgRepo.findOne({ where: { slug: CANONICAL.orgSlug } });
}

async function findCanonicalBusiness(businessRepo, organizationId) {
  return businessRepo.findOne({
    where: { organizationId, name: CANONICAL.businessName },
  });
}

async function findCanonicalAgent(agentRepo, businessId) {
  return agentRepo.findOne({
    where: { businessId, name: CANONICAL.agentName, status: 'active' },
  });
}

async function findCanonicalPhone(phoneRepo) {
  return phoneRepo.findOne({
    where: {
      provider: 'twilio',
      providerNumberId: CANONICAL.twilioSid,
      status: 'active',
    },
  });
}

(async () => {
  const adminEmail = (process.env.D14_ADMIN_EMAIL || 'eaziacall-prod-admin@eazisol.com')
    .trim()
    .toLowerCase();
  const bootstrapPassword = (process.env.D14_BOOTSTRAP_PASSWORD || '').trim();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const orgService = app.get(OrganizationsService);
    const businessService = app.get(BusinessesService);
    const agentsService = app.get(AgentsService);
    const syncService = app.get(AgentProviderSyncService);
    const phoneService = app.get(PhoneNumbersService);
    const orgRepo = app.get(getRepositoryToken(Organization));
    const businessRepo = app.get(getRepositoryToken(Business));
    const agentRepo = app.get(getRepositoryToken(Agent));
    const phoneRepo = app.get(getRepositoryToken(PhoneNumber));
    const assignmentRepo = app.get(getRepositoryToken(PhoneNumberAssignment));
    const mappingRepo = app.get(getRepositoryToken(AgentProviderMapping));

    const userId = await ensureAdminUser(app, adminEmail, bootstrapPassword);

    let organization = await findCanonicalOrg(orgRepo);
    if (!organization) {
      const created = await orgService.create(userId, {
        name: CANONICAL.orgName,
        slug: CANONICAL.orgSlug,
      });
      organization = await orgRepo.findOne({ where: { id: created.id } });
      log('organization_created', 'yes');
    } else {
      log('organization_reused', 'yes');
    }
    if (!organization) fail('organization missing after create');
    log('organization_id', organization.id);
    log('organization_name', organization.name);

    let business = await findCanonicalBusiness(businessRepo, organization.id);
    if (!business) {
      const created = await businessService.create(userId, organization.id, {
        name: CANONICAL.businessName,
        industry: 'professional_services',
        email: adminEmail,
        phone: CANONICAL.phoneE164,
        timezone: 'America/New_York',
        defaultLanguage: 'en',
      });
      business = await businessRepo.findOne({ where: { id: created.id } });
      log('business_created', 'yes');
    } else {
      log('business_reused', 'yes');
    }
    if (!business) fail('business missing after create');
    if (business.status !== 'active') fail('business is not active');
    log('business_id', business.id);
    log('business_name', business.name);
    log('business_status', business.status);

    let agent = await findCanonicalAgent(agentRepo, business.id);
    if (!agent) {
      await agentsService.create(userId, organization.id, business.id, {
        name: CANONICAL.agentName,
        roleLabel: 'Receptionist',
        greeting:
          'Hello, thank you for calling EaziAICall. How may I help you today?',
        instructions:
          'You are the EaziAICall production receptionist. Answer politely, keep responses concise, and help callers with general business inquiries.',
      });
      agent = await findCanonicalAgent(agentRepo, business.id);
      log('agent_created', 'yes');
    } else {
      log('agent_reused', 'yes');
    }
    if (!agent) fail('agent missing after create');
    if (agent.status !== 'active') fail('agent is not active');
    log('agent_id', agent.id);
    log('agent_name', agent.name);
    log('agent_status', agent.status);

    let mapping = await mappingRepo.findOne({
      where: {
        agentId: agent.id,
        provider: 'elevenlabs',
        syncStatus: 'synced',
      },
    });

    if (!mapping?.externalAgentId) {
      const syncResult = await syncService.syncForUser(
        userId,
        organization.id,
        business.id,
        agent.id,
      );
      if (syncResult.sync.syncStatus !== 'synced' || !syncResult.sync.externalAgentId) {
        fail(
          `ElevenLabs sync failed: ${syncResult.sync.lastError || syncResult.sync.syncStatus}`,
          2,
        );
      }
      mapping = await mappingRepo.findOne({
        where: { agentId: agent.id, provider: 'elevenlabs' },
      });
      log('elevenlabs_synced', 'yes');
    } else {
      log('elevenlabs_mapping_reused', 'yes');
    }

    if (!mapping?.externalAgentId) fail('ElevenLabs external agent ID missing after sync');
    log('elevenlabs_external_agent_id', mapping.externalAgentId);
    log('elevenlabs_sync_status', mapping.syncStatus);

    let phone = await findCanonicalPhone(phoneRepo);
    if (!phone) {
      await phoneService.importForUser(userId, organization.id, business.id, {
        phoneNumber: CANONICAL.phoneE164,
        friendlyName: 'EaziAICall Production',
      });
      phone = await findCanonicalPhone(phoneRepo);
      log('phone_imported', 'yes');
    } else {
      log('phone_reused', 'yes');
      if (phone.businessId !== business.id) {
        fail('existing phone number belongs to a different business');
      }
    }
    if (!phone) fail('phone number missing after import');
    if (phone.providerNumberId !== CANONICAL.twilioSid) {
      fail('phone provider SID mismatch');
    }
    log('phone_number_id', phone.id);
    log('phone_number_masked', '+183***9958');
    log('phone_provider_sid', phone.providerNumberId);
    log('phone_status', phone.status);

    let assignment = await assignmentRepo.findOne({
      where: { phoneNumberId: phone.id, status: 'active' },
    });
    if (!assignment || assignment.agentId !== agent.id) {
      await phoneService.assignForUser(
        userId,
        organization.id,
        business.id,
        phone.id,
        { agentId: agent.id },
      );
      assignment = await assignmentRepo.findOne({
        where: { phoneNumberId: phone.id, status: 'active' },
      });
      log('assignment_created', 'yes');
    } else {
      log('assignment_reused', 'yes');
    }
    if (!assignment || assignment.agentId !== agent.id) {
      fail('active phone assignment missing or incorrect');
    }
    log('assignment_id', assignment.id);
    log('assignment_agent_id', assignment.agentId);

    const callCount = await phoneRepo.manager.query(
      'SELECT COUNT(*)::int AS n FROM calls',
    );
    const eventCount = await phoneRepo.manager.query(
      'SELECT COUNT(*)::int AS n FROM provider_events',
    );
    log('call_count', callCount[0].n);
    log('provider_event_count', eventCount[0].n);

    log('routing_ready', 'yes');
    console.log('D14 provision=PASS');
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(`D14 provision failed: ${error.message || error}`);
  process.exit(1);
});
