/**
 * Canonical entitlement key registry (M25).
 * Stable, provider-neutral keys used by EntitlementsService and plan seeds.
 */

export const ENTITLEMENT_VALUE_TYPES = ['boolean', 'integer'] as const;
export type EntitlementValueType = (typeof ENTITLEMENT_VALUE_TYPES)[number];

export const ENTITLEMENT_KEYS = {
  BUSINESSES_MAX: 'businesses.max',
  AGENTS_MAX: 'agents.max',
  PHONE_NUMBERS_MAX: 'phone_numbers.max',
  MINUTES_MONTHLY_INCLUDED: 'minutes.monthly_included',
  VOICE_CLONING_ENABLED: 'voice_cloning.enabled',
  ANALYTICS_ENABLED: 'analytics.enabled',
  AUTOMATIONS_ENABLED: 'automations.enabled',
} as const;

export type EntitlementKey =
  (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];

export const ALL_ENTITLEMENT_KEYS: readonly EntitlementKey[] = Object.values(
  ENTITLEMENT_KEYS,
);

export const BOOLEAN_ENTITLEMENT_KEYS: readonly EntitlementKey[] = [
  ENTITLEMENT_KEYS.VOICE_CLONING_ENABLED,
  ENTITLEMENT_KEYS.ANALYTICS_ENABLED,
  ENTITLEMENT_KEYS.AUTOMATIONS_ENABLED,
];

export const INTEGER_ENTITLEMENT_KEYS: readonly EntitlementKey[] = [
  ENTITLEMENT_KEYS.BUSINESSES_MAX,
  ENTITLEMENT_KEYS.AGENTS_MAX,
  ENTITLEMENT_KEYS.PHONE_NUMBERS_MAX,
  ENTITLEMENT_KEYS.MINUTES_MONTHLY_INCLUDED,
];

export function isEntitlementKey(value: string): value is EntitlementKey {
  return (ALL_ENTITLEMENT_KEYS as readonly string[]).includes(value);
}

export function isBooleanEntitlementKey(key: string): boolean {
  return (BOOLEAN_ENTITLEMENT_KEYS as readonly string[]).includes(key);
}

export function isIntegerEntitlementKey(key: string): boolean {
  return (INTEGER_ENTITLEMENT_KEYS as readonly string[]).includes(key);
}

/** Expected value_type for a registered key. */
export function expectedValueTypeForKey(
  key: EntitlementKey,
): EntitlementValueType {
  return isBooleanEntitlementKey(key) ? 'boolean' : 'integer';
}
