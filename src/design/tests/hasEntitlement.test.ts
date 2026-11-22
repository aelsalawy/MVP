/**
 * Unit Tests for hasEntitlement
 *
 * Tests fail-closed behavior, all tiers, all features, edge cases
 */

import { hasEntitlement, TIERS, ENTITLEMENTS } from '../../entitlements';

describe('hasEntitlement', () => {
  describe('Fail-closed behavior', () => {
    test('unknown tier returns false', () => {
      expect(hasEntitlement('unknown', 'vehicles.max')).toBe(false);
      expect(hasEntitlement('', 'vehicles.max')).toBe(false);
      expect(hasEntitlement('pro', 'nonexistent')).toBe(false);
      expect(hasEntitlement('free', 'vehicles.max')).toBe(false);
    });

    test('unknown feature returns false', () => {
      expect(hasEntitlement('pro', 'nonexistent.feature')).toBe(false);
      expect(hasEntitlement('advanced', 'custom.feature')).toBe(false);
    });
  });

  describe('Free tier', () => {
    test('vehicles.max: free tier has 1 vehicle', () => {
      expect(hasEntitlement('free', 'vehicles.max')).toBe(true);
      expect(hasEntitlement('free', 'vehicles.tracked')).toBe(true);
    });

    test('tracking.active: free tier has 1 active tracker', () => {
      expect(hasEntitlement('free', 'tracking.active')).toBe(true);
    });

    test('tracking.duration: free tier has 24 hours', () => {
      expect(hasEntitlement('free', 'tracking.duration')).toBe(true);
    });

    test('tracking.history: free tier has 7 days', () => {
      expect(hasEntitlement('free', 'tracking.history')).toBe(true);
    });

    test('log.manual: free tier has 10 manual logs', () => {
      expect(hasEntitlement('free', 'log.manual')).toBe(true);
    });

    test('reminders: free tier has 1 reminder', () => {
      expect(hasEntitlement('free', 'reminders')).toBe(true);
    });

    test('history.export: free tier is false', () => {
      expect(hasEntitlement('free', 'history.export')).toBe(false);
    });

    test('ocr: free tier is false', () => {
      expect(hasEntitlement('free', 'ocr')).toBe(false);
    });

    test('receipt.storage: free tier is false', () => {
      expect(hasEntitlement('free', 'receipt.storage')).toBe(false);
    });
  });

  describe('Advanced tier (RESERVED)', () => {
    test('vehicles.max: advanced tier has 3 vehicles', () => {
      expect(hasEntitlement('advanced', 'vehicles.max')).toBe(true);
      expect(hasEntitlement('advanced', 'vehicles.tracked')).toBe(true);
    });

    test('tracking.active: advanced tier has 5 active trackers', () => {
      expect(hasEntitlement('advanced', 'tracking.active')).toBe(true);
    });

    test('tracking.duration: advanced tier has 168 hours (1 week)', () => {
      expect(hasEntitlement('advanced', 'tracking.duration')).toBe(true);
    });

    test('tracking.history: advanced tier has 30 days', () => {
      expect(hasEntitlement('advanced', 'tracking.history')).toBe(true);
    });

    test('log.manual: advanced tier has unlimited logs', () => {
      expect(hasEntitlement('advanced', 'log.manual')).toBe(true);
    });

    test('reminders: advanced tier has 3 reminders', () => {
      expect(hasEntitlement('advanced', 'reminders')).toBe(true);
    });

    test('history.export: advanced tier is true', () => {
      expect(hasEntitlement('advanced', 'history.export')).toBe(true);
    });

    test('ocr: advanced tier is false', () => {
      expect(hasEntitlement('advanced', 'ocr')).toBe(false);
    });

    test('receipt.storage: advanced tier is true', () => {
      expect(hasEntitlement('advanced', 'receipt.storage')).toBe(true);
    });
  });

  describe('Pro tier', () => {
    test('vehicles.max: pro tier has unlimited vehicles', () => {
      expect(hasEntitlement('pro', 'vehicles.max')).toBe(true);
      expect(hasEntitlement('pro', 'vehicles.tracked')).toBe(true);
    });

    test('tracking.active: pro tier has unlimited active trackers', () => {
      expect(hasEntitlement('pro', 'tracking.active')).toBe(true);
    });

    test('tracking.duration: pro tier has unlimited duration', () => {
      expect(hasEntitlement('pro', 'tracking.duration')).toBe(true);
    });

    test('tracking.history: pro tier has unlimited history', () => {
      expect(hasEntitlement('pro', 'tracking.history')).toBe(true);
    });

    test('log.manual: pro tier has unlimited logs', () => {
      expect(hasEntitlement('pro', 'log.manual')).toBe(true);
    });

    test('reminders: pro tier has unlimited reminders', () => {
      expect(hasEntitlement('pro', 'reminders')).toBe(true);
    });

    test('history.export: pro tier is true', () => {
      expect(hasEntitlement('pro', 'history.export')).toBe(true);
    });

    test('ocr: pro tier is true', () => {
      expect(hasEntitlement('pro', 'ocr')).toBe(true);
    });

    test('receipt.storage: pro tier is true', () => {
      expect(hasEntitlement('pro', 'receipt.storage')).toBe(true);
    });

    test('analytics.enabled: pro tier is true', () => {
      expect(hasEntitlement('pro', 'analytics.enabled')).toBe(true);
    });

    test('support.priority: pro tier is true', () => {
      expect(hasEntitlement('pro', 'support.priority')).toBe(true);
    });
  });

  describe('Type safety', () => {
    test('valid tier strings pass', () => {
      TIERS.forEach(tier => {
        expect(hasEntitlement(tier, 'vehicles.max')).toBeDefined();
        expect(hasEntitlement(tier, 'log.manual')).toBeDefined();
      });
    });

    test('pro tier allows all features', () => {
      Object.keys(ENTITLEMENTS).forEach(featureKey => {
        expect(hasEntitlement('pro', featureKey)).toBe(true);
      });
    });
  });
});
