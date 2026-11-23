/**
 * T7.2 (D3.1): OCR metering unit tests — readEntitlements + canSpendOcr
 * gate semantics, plus the callable success path (increment AFTER success).
 * All against mocked Firestore-shaped objects — no real Firestore.
 */

import { readEntitlements, canSpendOcr, MeteringDb, EntitlementSnapshot } from '../src/metering';
import { OCR_FREE_MONTHLY_LIMIT, OCR_MONTHLY_LIMITS } from '../src/tiers';
import { wrapOcrParseCore } from '../src/ocrParseCore';

/** Build a mock users/{uid} doc snapshot. */
function snapDoc(fields: Record<string, unknown> | null) {
  return {
    exists: fields !== null,
    data: () => fields ?? undefined,
  };
}

/**
 * Mock db where `users` docs are pre-seeded. Any other collection → missing doc.
 * Shape-compatible with MeteringDb (structural subset of admin Firestore).
 */
function makeDb(users: Record<string, Record<string, unknown> | null>): MeteringDb {
  return {
    collection: (path: string) => ({
      doc: (id: string) => ({
        get: async () => (path === 'users' ? snapDoc(users[id] ?? null) : snapDoc(null)),
      }),
    }),
  };
}

const FREE_USER = { planTier: 'free', ocrMeterCount: 0 };
const PRO_USER = { planTier: 'pro', ocrMeterCount: 999 };

describe('readEntitlements (T7.2)', () => {
  test('reads planTier + ocrMeterCount from the user doc', async () => {
    const db = makeDb({ u1: FREE_USER });
    const snap: EntitlementSnapshot = await readEntitlements(db, 'u1');
    expect(snap).toEqual({ planTier: 'free', ocrMeterCount: 0 });
  });

  test('missing user doc → null tier + zero count (gate then fails closed)', async () => {
    const snap = await readEntitlements(makeDb({}), 'ghost');
    expect(snap).toEqual({ planTier: null, ocrMeterCount: 0 });
  });

  test('missing/invalid field types degrade to null/0', async () => {
    const db = makeDb({ u1: { planTier: 42, ocrMeterCount: 'lots' } });
    const snap = await readEntitlements(db, 'u1');
    expect(snap).toEqual({ planTier: null, ocrMeterCount: 0 });
  });

  test('empty uid → fail-closed snapshot', async () => {
    const snap = await readEntitlements(makeDb({}), '');
    expect(snap).toEqual({ planTier: null, ocrMeterCount: 0 });
  });
});

describe('canSpendOcr gate boundary (D3.1 fail-closed)', () => {
  test('unknown tier on user doc → DENIED (fail closed)', async () => {
    const db = makeDb({ u1: { planTier: 'enterprise', ocrMeterCount: 0 } });
    const d = await canSpendOcr(db, 'u1');
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('unknown_tier');
  });

  test('missing tier (field absent / doc absent) → DENIED', async () => {
    const noDoc = await canSpendOcr(makeDb({}), 'ghost');
    expect(noDoc).toEqual({ allowed: false, reason: 'unknown_tier' });
    const db = makeDb({ u1: { ocrMeterCount: 3 } });
    const noField = await canSpendOcr(db, 'u1');
    expect(noField).toEqual({ allowed: false, reason: 'unknown_tier' });
  });

  test(`free tier at limit-1 (${OCR_FREE_MONTHLY_LIMIT - 1}) → allowed`, async () => {
    const db = makeDb({ u1: { planTier: 'free', ocrMeterCount: OCR_FREE_MONTHLY_LIMIT - 1 } });
    const d = await canSpendOcr(db, 'u1');
    expect(d.allowed).toBe(true);
    expect(d.reason).toBeNull();
  });

  test(`free tier at limit (${OCR_FREE_MONTHLY_LIMIT}) → rejected`, async () => {
    const db = makeDb({ u1: { planTier: 'free', ocrMeterCount: OCR_FREE_MONTHLY_LIMIT } });
    const d = await canSpendOcr(db, 'u1');
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('meter_exhausted');
  });

  test(`free tier above limit (${OCR_FREE_MONTHLY_LIMIT + 5}) → rejected`, async () => {
    const db = makeDb({ u1: { planTier: 'free', ocrMeterCount: OCR_FREE_MONTHLY_LIMIT + 5 } });
    expect((await canSpendOcr(db, 'u1')).allowed).toBe(false);
  });

  test('pro tier with high count → allowed (unlimited per matrix)', async () => {
    const db = makeDb({ u1: PRO_USER });
    const d = await canSpendOcr(db, 'u1');
    expect(d.allowed).toBe(true);
  });

  test('every tier in OCR_MONTHLY_LIMITS has a defined numeric/Infinity limit (no NaN holes)', () => {
    for (const limit of Object.values(OCR_MONTHLY_LIMITS)) {
      expect(typeof limit).toBe('number');
      expect(Number.isNaN(limit)).toBe(false);
    }
  });
});

/**
 * Increment-after-success path: exercise the pure core (wrapOcrParseCore)
 * with mocked db + mocked parse fn. Contract:
 *  - gate blocks BEFORE parse when meter is exhausted (parse never called)
 *  - meter incremented exactly once, only AFTER a successful parse+save
 */
describe('wrapOcrParseCore: increment AFTER success (T7.2)', () => {
  const AUTH = { uid: 'u1' };
  const REQ = { storagePath: 'receipts/u1/e1.jpg', entryId: 'e1', vehicleId: 'v1', odometer: 1000 };
  const API_KEY = 'k-test';

  interface CoreMocks {
    db: MeteringDb;
    parse: jest.Mock;
    increment: jest.Mock;
  }

  function makeCore(userDoc: Record<string, unknown> | null): CoreMocks {
    const db = makeDb(userDoc ? { u1: userDoc } : {});
    const parse = jest.fn().mockResolvedValue({ uid: 'e1' });
    const increment = jest.fn().mockResolvedValue(undefined);
    return { db, parse, increment };
  }

  test('happy path: parse called, then meter incremented after success', async () => {
    const m = makeCore(FREE_USER);
    const out = await wrapOcrParseCore(m.db, AUTH, REQ, API_KEY, m.parse, m.increment);
    expect(out.result).toEqual({ uid: 'e1' });
    expect(m.parse).toHaveBeenCalledTimes(1);
    expect(m.increment).toHaveBeenCalledTimes(1);
    // Ordering: parse must resolve before the increment is invoked.
    expect(m.increment.mock.invocationCallOrder[0]).toBeGreaterThan(
      m.parse.mock.invocationCallOrder[0]
    );
  });

  test('gate blocks: parse and increment NEVER called when meter exhausted', async () => {
    const m = makeCore({ planTier: 'free', ocrMeterCount: OCR_FREE_MONTHLY_LIMIT });
    const out = await wrapOcrParseCore(m.db, AUTH, REQ, API_KEY, m.parse, m.increment);
    expect(out).toEqual({ error: 'permission-denied', message: 'meter_exhausted' });
    expect(m.parse).not.toHaveBeenCalled();
    expect(m.increment).not.toHaveBeenCalled();
  });

  test('gate blocks on unknown tier: no parse, no increment (fail closed)', async () => {
    const m = makeCore({ planTier: 'mystery', ocrMeterCount: 0 });
    const out = await wrapOcrParseCore(m.db, AUTH, REQ, API_KEY, m.parse, m.increment);
    expect(out).toEqual({ error: 'permission-denied', message: 'unknown_tier' });
    expect(m.parse).not.toHaveBeenCalled();
    expect(m.increment).not.toHaveBeenCalled();
  });

  test('no auth → unauthenticated error, nothing else touched', async () => {
    const m = makeCore(FREE_USER);
    const out = await wrapOcrParseCore(m.db, { uid: '' }, REQ, API_KEY, m.parse, m.increment);
    expect(out.error).toBe('unauthenticated');
    expect(m.parse).not.toHaveBeenCalled();
    expect(m.increment).not.toHaveBeenCalled();
  });

  test('missing params → invalid-argument, no parse', async () => {
    const m = makeCore(FREE_USER);
    const out = await wrapOcrParseCore(m.db, AUTH, {} as typeof REQ, API_KEY, m.parse, m.increment);
    expect(out.error).toBe('invalid-argument');
    expect(m.parse).not.toHaveBeenCalled();
  });

  test('no API key → not_configured, gate/parse/increment all skipped', async () => {
    const m = makeCore(FREE_USER);
    const out = await wrapOcrParseCore(m.db, AUTH, REQ, '', m.parse, m.increment);
    expect(out).toEqual({ error: 'not_configured' });
    expect(m.parse).not.toHaveBeenCalled();
    expect(m.increment).not.toHaveBeenCalled();
  });

  test('parse returns null (parse failed) → no meter increment', async () => {
    const m = makeCore(FREE_USER);
    m.parse.mockResolvedValue(null);
    const out = await wrapOcrParseCore(m.db, AUTH, REQ, API_KEY, m.parse, m.increment);
    expect(out).toEqual({ error: 'parse_failed' });
    expect(m.increment).not.toHaveBeenCalled();
  });

  test('parse throws → error path, no meter increment', async () => {
    const m = makeCore(FREE_USER);
    m.parse.mockRejectedValue(new Error('boom'));
    const out = await wrapOcrParseCore(m.db, AUTH, REQ, API_KEY, m.parse, m.increment);
    expect(out.error).toBe('internal');
    expect(m.increment).not.toHaveBeenCalled();
  });
});
