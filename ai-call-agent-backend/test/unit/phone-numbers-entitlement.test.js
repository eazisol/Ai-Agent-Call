const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const {
  PhoneNumbersService,
} = require('../../dist/modules/phone-numbers/phone-numbers.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

test('purchase is blocked by PLAN_LIMIT_REACHED before telephony.purchaseNumber', async () => {
  let purchaseCalls = 0;
  const telephony = {
    providerName: 'twilio',
    isConfigured: () => true,
    purchaseNumber: async () => {
      purchaseCalls += 1;
      return { externalNumberId: 'PN_X', phoneNumber: '+14155550199' };
    },
    defaultWebhookUrls: () => ({
      voiceWebhookUrl: 'https://example.test/voice',
      statusCallbackUrl: 'https://example.test/status',
    }),
  };

  const orgId = randomUUID();
  const bizId = randomUUID();
  const userId = randomUUID();

  const organizations = {
    requireMembership: async () => ({
      role: 'owner',
      organization: { id: orgId },
    }),
  };

  const entitlements = {
    assertCanAddPhoneNumber: async () => {
      throw new ApplicationError(
        'PLAN_LIMIT_REACHED',
        'You have reached the limit for your current plan.',
        403,
        { featureKey: 'phone_numbers.max', limit: 1, current: 1 },
      );
    },
  };

  const businesses = {
    findOne: async () => ({ id: bizId, organizationId: orgId, status: 'active' }),
  };

  const phoneNumbers = {
    create: (data) => ({ id: randomUUID(), ...data }),
    save: async () => {
      throw new Error('should not save when entitlement blocks');
    },
    findOne: async () => null,
    createQueryBuilder() {
      return {
        where() {
          return this;
        },
        andWhere() {
          return this;
        },
        getOne: async () => null,
      };
    },
  };

  const service = new PhoneNumbersService(
    { transaction: async (fn) => fn({}) },
    organizations,
    entitlements,
    { record: async () => undefined },
    telephony,
    phoneNumbers,
    { find: async () => [], save: async (x) => x },
    { findOne: async () => ({ id: randomUUID(), businessId: bizId, status: 'active' }) },
    businesses,
  );

  await assert.rejects(
    () =>
      service.purchaseForUser(userId, orgId, bizId, {
        phoneNumber: '+14155550199',
        confirm: true,
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PLAN_LIMIT_REACHED',
  );
  assert.equal(purchaseCalls, 0);
});
