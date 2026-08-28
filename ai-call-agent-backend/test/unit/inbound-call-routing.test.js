const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CallRoutingResolverService,
} = require('../../dist/modules/calls/call-routing-resolver.service');

function createResolver(repos) {
  return new CallRoutingResolverService(
    repos.phoneRepository,
    repos.assignmentRepository,
    repos.agentRepository,
    repos.agentConfigRepository,
    repos.agentPromptRepository,
    repos.agentMappingRepository,
    repos.agentKnowledgeRepository,
    repos.knowledgeRepository,
    repos.knowledgeMappingRepository,
    repos.voiceAssetRepository,
    repos.voiceMappingRepository,
    repos.voiceCloneRepository,
  );
}

const phone = {
  id: 'phone-1',
  businessId: 'biz-1',
  phoneNumberE164: '+14155550100',
  status: 'active',
};

const agent = {
  id: 'agent-1',
  businessId: 'biz-1',
  name: 'Receptionist',
  status: 'active',
};

test('resolve returns UNKNOWN_NUMBER when phone is missing', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => null },
    assignmentRepository: { findOne: async () => null },
    agentRepository: { findOne: async () => null },
    agentConfigRepository: { findOne: async () => null },
    agentPromptRepository: { findOne: async () => null },
    agentMappingRepository: { findOne: async () => null },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'UNKNOWN_NUMBER');
  }
});

test('resolve returns UNASSIGNED_NUMBER when no active assignment', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: { findOne: async () => null },
    agentRepository: { findOne: async () => null },
    agentConfigRepository: { findOne: async () => null },
    agentPromptRepository: { findOne: async () => null },
    agentMappingRepository: { findOne: async () => null },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'UNASSIGNED_NUMBER');
  }
});

test('resolve succeeds with synced agent mapping', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: {
      findOne: async () => ({ agentId: agent.id, status: 'active' }),
    },
    agentRepository: { findOne: async () => agent },
    agentConfigRepository: { findOne: async () => ({ voiceId: null }) },
    agentPromptRepository: {
      findOne: async () => ({ greeting: 'Hello from Acme.' }),
    },
    agentMappingRepository: {
      findOne: async () => ({
        externalAgentId: 'el-agent-1',
        syncStatus: 'synced',
      }),
    },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.context.externalAgentId, 'el-agent-1');
    assert.equal(result.context.agentName, 'Receptionist');
  }
});

test('resolve returns UNSYNCED_AGENT when mapping missing', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: {
      findOne: async () => ({ agentId: agent.id, status: 'active' }),
    },
    agentRepository: { findOne: async () => agent },
    agentConfigRepository: { findOne: async () => ({ voiceId: null }) },
    agentPromptRepository: { findOne: async () => ({ greeting: 'Hi' }) },
    agentMappingRepository: { findOne: async () => null },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'UNSYNCED_AGENT');
  }
});

test('resolve returns INACTIVE_AGENT when agent is archived', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: {
      findOne: async () => ({ agentId: agent.id, status: 'active' }),
    },
    agentRepository: {
      findOne: async () => ({ ...agent, status: 'archived' }),
    },
    agentConfigRepository: { findOne: async () => null },
    agentPromptRepository: { findOne: async () => null },
    agentMappingRepository: { findOne: async () => null },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'INACTIVE_AGENT');
  }
});

test('resolve returns CROSS_BUSINESS_MAPPING when agent belongs to another business', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: {
      findOne: async () => ({ agentId: agent.id, status: 'active' }),
    },
    agentRepository: {
      findOne: async () => ({ ...agent, businessId: 'other-biz' }),
    },
    agentConfigRepository: { findOne: async () => ({ voiceId: null }) },
    agentPromptRepository: { findOne: async () => ({ greeting: 'Hi' }) },
    agentMappingRepository: { findOne: async () => null },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'CROSS_BUSINESS_MAPPING');
  }
});

test('resolve returns KNOWLEDGE_NOT_READY when assigned knowledge is not synced', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: {
      findOne: async () => ({ agentId: agent.id, status: 'active' }),
    },
    agentRepository: { findOne: async () => agent },
    agentConfigRepository: { findOne: async () => ({ voiceId: null }) },
    agentPromptRepository: { findOne: async () => ({ greeting: 'Hi' }) },
    agentMappingRepository: {
      findOne: async () => ({
        externalAgentId: 'el-agent-1',
        syncStatus: 'synced',
      }),
    },
    agentKnowledgeRepository: {
      find: async () => [{ knowledgeSourceId: 'kb-1' }],
    },
    knowledgeRepository: {
      findOne: async () => ({ id: 'kb-1', status: 'active' }),
    },
    knowledgeMappingRepository: {
      findOne: async () => ({ syncStatus: 'pending' }),
    },
    voiceAssetRepository: { findOne: async () => null },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'KNOWLEDGE_NOT_READY');
  }
});

test('resolve returns VOICE_NOT_READY when selected voice mapping is missing', async () => {
  const resolver = createResolver({
    phoneRepository: { findOne: async () => phone },
    assignmentRepository: {
      findOne: async () => ({ agentId: agent.id, status: 'active' }),
    },
    agentRepository: { findOne: async () => agent },
    agentConfigRepository: { findOne: async () => ({ voiceId: 'voice-1' }) },
    agentPromptRepository: { findOne: async () => ({ greeting: 'Hi' }) },
    agentMappingRepository: {
      findOne: async () => ({
        externalAgentId: 'el-agent-1',
        syncStatus: 'synced',
      }),
    },
    agentKnowledgeRepository: { find: async () => [] },
    knowledgeRepository: { findOne: async () => null },
    knowledgeMappingRepository: { findOne: async () => null },
    voiceAssetRepository: {
      findOne: async () => ({
        id: 'voice-1',
        status: 'active',
        sourceType: 'provider_catalog',
      }),
    },
    voiceMappingRepository: { findOne: async () => null },
    voiceCloneRepository: { findOne: async () => null },
  });

  const result = await resolver.resolve('+14155550100');
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.code, 'VOICE_NOT_READY');
  }
});
