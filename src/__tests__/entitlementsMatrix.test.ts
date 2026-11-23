/** T8.1a: D3.1 entitlements matrix — every feature key × all 3 tiers. */
import { hasEntitlement, getEntitlementLimit, ENTITLEMENTS, TIERS, type Tier } from '../entitlements';

const SPEC_MATRIX: Record<string, Record<Tier, number | boolean>> = {
  'vehicles.max': { free: 1, advanced: 3, pro: Infinity },
  'log.manual': { free: true, advanced: true, pro: true },
  'reminders': { free: true, advanced: true, pro: true },
  'history.export': { free: false, advanced: true, pro: true },
  'ocr': { free: false, advanced: false, pro: true },
  'receipt.storage': { free: false, advanced: true, pro: true },
};

const ALL_FEATURE_KEYS: string[] = Object.keys(ENTITLEMENTS);
const MATRIX = ENTITLEMENTS as unknown as Record<string, Record<Tier, number | boolean>>;

describe('D3.1 entitlements matrix — full cross product', () => {
  test('map covers exactly the spec §3.1 feature keys', () => {
    expect([...ALL_FEATURE_KEYS].sort()).toEqual([...Object.keys(SPEC_MATRIX)].sort());
  });

  test('every feature key has a value for every tier (matrix completeness)', () => {
    for (const key of ALL_FEATURE_KEYS) {
      for (const tier of TIERS) {
        expect(Object.prototype.hasOwnProperty.call(MATRIX[key], tier)).toBe(true);
        expect(MATRIX[key][tier]).toBeDefined();
      }
    }
  });

  describe.each(TIERS)('tier: %s', (tier) => {
    test.each(ALL_FEATURE_KEYS)('hasEntitlement + limit for %s', (key) => {
      const expected = SPEC_MATRIX[key][tier];
      const allowed = expected === Infinity || expected === true || (typeof expected === 'number' && expected > 0);
      expect(hasEntitlement(tier, key)).toBe(allowed);
      expect(getEntitlementLimit(tier, key)).toBe(expected === true ? Infinity : expected === false ? 0 : expected);
    });
  });

  test('spec expectations: free tier shape (FR gating)', () => {
    expect(getEntitlementLimit('free', 'vehicles.max')).toBe(1);
    expect(hasEntitlement('free', 'log.manual')).toBe(true);
    expect(hasEntitlement('free', 'reminders')).toBe(true);
    expect(hasEntitlement('free', 'ocr')).toBe(false);
    expect(hasEntitlement('free', 'history.export')).toBe(false);
    expect(hasEntitlement('free', 'receipt.storage')).toBe(false);
  });

  test('spec expectations: advanced tier (reserved, future)', () => {
    expect(getEntitlementLimit('advanced', 'vehicles.max')).toBe(3);
    expect(hasEntitlement('advanced', 'history.export')).toBe(true);
    expect(hasEntitlement('advanced', 'receipt.storage')).toBe(true);
    expect(hasEntitlement('advanced', 'ocr')).toBe(false); // OCR stays pro-only even after advanced launches
  });

  test('spec expectations: pro tier', () => {
    expect(getEntitlementLimit('pro', 'vehicles.max')).toBe(Infinity);
    expect(hasEntitlement('pro', 'ocr')).toBe(true);
    expect(hasEntitlement('pro', 'history.export')).toBe(true);
    expect(hasEntitlement('pro', 'receipt.storage')).toBe(true);
  });

  test('fail-closed: every feature key with unknown tier', () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(hasEntitlement('enterprise', key)).toBe(false);
      expect(hasEntitlement('', key)).toBe(false);
      expect(getEntitlementLimit('enterprise', key)).toBe(0);
    }
  });

  test('fail-closed: every tier with unknown feature key', () => {
    for (const tier of TIERS.concat(['bogus' as Tier])) {
      expect(hasEntitlement(tier, 'does.not.exist')).toBe(false);
      expect(getEntitlementLimit(tier, 'does.not.exist')).toBe(0);
    }
  });
});
