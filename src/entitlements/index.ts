/**
 * Entitlements Map
 *
 * D3.1 - Single source of truth for feature entitlements across tiers.
 * - TIERS: 'free' | 'advanced' | 'pro'
 * - ENTITLEMENTS: feature-keyed object with tier access levels
 * - hasEntitlement(tier, featureKey): fail-closed (unknown tier/feature → false)
 * - Advanced tier is RESERVED and explicitly included in type+map but unused at launch
 */

export type Tier = 'free' | 'advanced' | 'pro';

export interface EntitlementTier {
  free: number;
  advanced: number;
  pro: number;
}

/**
 * TIERS: Available subscription tiers
 */
export const TIERS: Tier[] = ['free', 'advanced', 'pro'];

/**
 * ENTITLEMENTS: Feature-keyed tier access map
 * - Count represents tier limit (Infinity for unlimited/pro)
 * - Boolean in map for features that are either available or not (no tiered limits)
 */
export const ENTITLEMENTS: Record<string, EntitlementTier> = {
  // Vehicle limits
  'vehicles.max': { free: 1, advanced: 3, pro: Infinity },
  'vehicles.tracked': { free: 1, advanced: 3, pro: Infinity },

  // Tracking features
  'tracking.active': { free: 1, advanced: 5, pro: Infinity },
  'tracking.duration': { free: 24, advanced: 168, pro: Infinity },
  'tracking.history': { free: 7, advanced: 30, pro: Infinity },

  // Manual features
  'log.manual': { free: 10, advanced: Infinity, pro: Infinity },

  // Reminders
  'reminders': { free: 1, advanced: 3, pro: Infinity },

  // Export
  'history.export': { free: false, advanced: true, pro: true },

  // OCR
  'ocr': { free: false, advanced: false, pro: true },

  // Receipt storage
  'receipt.storage': { free: false, advanced: true, pro: true },

  // Analytics
  'analytics.enabled': { free: false, advanced: true, pro: true },

  // Support
  'support.priority': { free: false, advanced: false, pro: true },
};

/**
 * hasEntitlement
 *
 * Determines if a given tier has access to a specific feature.
 *
 * @param tier - The user's subscription tier
 * @param featureKey - The feature to check entitlement for
 * @returns true if the tier has access, false otherwise (fail-closed)
 *
 * Fail-closed behavior:
 * - Unknown tier → false
 * - Unknown feature → false
 * - Advanced tier is included in type but unused at launch
 */
export function hasEntitlement(tier: string, featureKey: string): boolean {
  // Fail-closed: unknown tier returns false
  const validTier = TIERS.includes(tier as Tier) ? (tier as Tier) : null;
  if (!validTier) {
    return false;
  }

  // Fail-closed: unknown feature returns false
  if (!(featureKey in ENTITLEMENTS)) {
    return false;
  }

  const entitlement = ENTITLEMENTS[featureKey];
  const tierValue = entitlement[validTier];

  // For boolean-based entitlements (e.g., free: false, advanced: true, pro: true)
  if (typeof tierValue === 'boolean') {
    return tierValue;
  }

  // For numeric-based entitlements (e.g., vehicles.max)
  // Infinity represents unlimited access
  return tierValue === Infinity;
}

/**
 * getEntitlementLimit
 *
 * Get the numeric limit for a specific feature in a specific tier.
 * Returns Infinity if unlimited.
 *
 * @param tier - The user's subscription tier
 * @param featureKey - The feature to get the limit for
 * @returns The limit value or Infinity
 */
export function getEntitlementLimit(tier: string, featureKey: string): number {
  // Fail-closed: unknown tier returns 0
  const validTier = TIERS.includes(tier as Tier) ? (tier as Tier) : null;
  if (!validTier) {
    return 0;
  }

  // Fail-closed: unknown feature returns 0
  if (!(featureKey in ENTITLEMENTS)) {
    return 0;
  }

  const entitlement = ENTITLEMENTS[featureKey];
  return entitlement[validTier];
}

/**
 * getAvailableFeatures
 *
 * Get all features available to a specific tier.
 *
 * @param tier - The user's subscription tier
 * @returns Array of feature keys
 */
export function getAvailableFeatures(tier: string): string[] {
  return Object.keys(ENTITLEMENTS).filter(featureKey => hasEntitlement(tier, featureKey));
}

/**
 * getTierName
 *
 * Get the human-readable name for a tier.
 *
 * @param tier - The tier code
 * @returns The tier name
 */
export function getTierName(tier: string): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'advanced':
      return 'Advanced';
    case 'pro':
      return 'Pro';
    default:
      return 'Unknown';
  }
}

/**
 * TIER_NAMES
 *
 * Exported for convenience in UI displays.
 */
export const TIER_NAMES: Record<Tier, string> = {
  free: 'Free',
  advanced: 'Advanced',
  pro: 'Pro',
};
