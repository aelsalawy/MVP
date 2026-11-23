/**
 * Shared tier constants (T7.2, D3.1) — Cloud Functions side.
 *
 * src/entitlements/index.ts (client) is the CANONICAL single source of truth
 * for the entitlements matrix (spec D3.1). Cloud Functions are a separate
 * package/deploy root and cannot import app code, so the tier list and the
 * free-tier OCR monthly limit are DUPLICATED here. This client+functions
 * duplication is documented and intentional: keep both in sync — changing
 * one requires changing the other.
 */

/** Subscription tiers — mirror of src/entitlements/index.ts TIERS. */
export const TIERS = ['free', 'advanced', 'pro'] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Free-tier monthly OCR scan allowance (T7.2 metering cap, spec D3.1).
 * Canonical location: src/entitlements/index.ts (client) — duplicated here
 * for the functions package (see header comment).
 */
export const OCR_FREE_MONTHLY_LIMIT = 10;

/**
 * Per-tier monthly OCR meter cap. 'advanced' is RESERVED for future use
 * (spec D3.1) but mirrors the entitlements matrix ('ocr': advanced/pro are
 * entitled → unlimited for metering purposes).
 * No hardcoded tier strings at usage sites — gate via this record's keys.
 */
export const OCR_MONTHLY_LIMITS: Record<Tier, number> = {
  free: OCR_FREE_MONTHLY_LIMIT,
  advanced: Infinity,
  pro: Infinity,
};

/** Tier guard (D3.1 fail-closed: unknown/missing tier is NOT known). */
export function isKnownTier(tier: string | null | undefined): tier is Tier {
  return (TIERS as readonly string[]).includes(tier as string);
}
