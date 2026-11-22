/** T1.4 unit tests: entitlements map (D3.1) — fail-closed + tier matrix. */
import { hasEntitlement, getEntitlementLimit, ENTITLEMENTS, TIERS } from './index';

describe('D3.1 entitlements map', () => {
  test('reserved advanced tier is present in map', () => {
    expect(TIERS).toContain('advanced');
    for (const key of Object.keys(ENTITLEMENTS)) {
      expect(Object.prototype.hasOwnProperty.call((ENTITLEMENTS as Record<string, Record<string, unknown>>)[key], 'advanced')).toBe(true);
    }
  });
  test('free tier: 1 vehicle, manual+reminders yes, ocr no', () => {
    expect(getEntitlementLimit('free', 'vehicles.max')).toBe(1);
    expect(hasEntitlement('free', 'log.manual')).toBe(true);
    expect(hasEntitlement('free', 'reminders')).toBe(true);
    expect(hasEntitlement('free', 'ocr')).toBe(false);
    expect(hasEntitlement('free', 'history.export')).toBe(false);
    expect(hasEntitlement('free', 'receipt.storage')).toBe(false);
  });
  test('pro tier: unlimited vehicles + ocr + export', () => {
    expect(getEntitlementLimit('pro', 'vehicles.max')).toBe(Infinity);
    expect(hasEntitlement('pro', 'ocr')).toBe(true);
    expect(hasEntitlement('pro', 'history.export')).toBe(true);
  });
  test('unknown tier fails closed', () => {
    expect(hasEntitlement('enterprise', 'ocr')).toBe(false);
    expect(getEntitlementLimit('enterprise', 'vehicles.max')).toBe(0);
  });
  test('unknown feature fails closed', () => {
    expect(hasEntitlement('pro', 'nonexistent.key')).toBe(false);
    expect(getEntitlementLimit('pro', 'nonexistent.key')).toBe(0);
  });
  test('boolean limits: free history.export false', () => {
    expect(getEntitlementLimit('free', 'history.export')).toBe(0);
  });
});
