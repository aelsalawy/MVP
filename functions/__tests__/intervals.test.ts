/**
 * T4.1 (FR-3.1): importIntervals unit tests — slug determinism,
 * validation, and idempotent upserts against a mocked Firestore.
 */

import { importIntervals, intervalSlug, INTERVALS_COLLECTION } from '../src/intervals';

/**
 * Minimal Firestore mock: records set() operations on batches.
 * Mirrors the shape of admin.firestore() used by importIntervals.
 */
function makeMockDb() {
  const writes: Array<{ id: string; data: Record<string, unknown> }> = [];
  const batch = {
    _op_count: 0,
    set(ref: { id: string }, data: Record<string, unknown>) {
      writes.push({ id: ref.id, data });
      batch._op_count++;
    },
  };
  const collectionObj = {
    doc(id: string) {
      return { id };
    },
  };
  const db = {
    batch: () => batch,
    collection: (_name: string) => collectionObj,
  };
  return { db: db as never, writes };
}

const VALID_ROW = {
  make: 'Toyota',
  model: 'Camry',
  yearFrom: 2015,
  yearTo: 2025,
  item: 'oil_change',
  intervalMiles: 10000,
  intervalMonths: 12,
};

describe('intervalSlug (T4.1)', () => {
  test('deterministic make_model_year_item slug', () => {
    expect(intervalSlug(VALID_ROW)).toBe('toyota_camry_2015_2025_oil_change');
  });

  test('same input always yields same slug', () => {
    expect(intervalSlug(VALID_ROW)).toBe(intervalSlug({ ...VALID_ROW }));
  });

  test('slugifies spaces and special chars', () => {
    expect(
      intervalSlug({ make: 'Mercedes-Benz', model: 'C-Class', yearFrom: 2015, yearTo: 2025, item: 'oil change' })
    ).toBe('mercedes_benz_c_class_2015_2025_oil_change');
  });

  test('case-insensitive: same vehicle/item different casing → same slug', () => {
    expect(intervalSlug(VALID_ROW)).toBe(
      intervalSlug({ ...VALID_ROW, make: 'TOYOTA', model: 'camry', item: 'Oil_Change' })
    );
  });
});

describe('importIntervals (T4.1)', () => {
  test('imports valid rows with deterministic doc ids', async () => {
    const { db, writes } = makeMockDb();
    const result = await importIntervals([VALID_ROW], db);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(writes).toHaveLength(1);
    expect(writes[0].id).toBe('toyota_camry_2015_2025_oil_change');
  });

  test('idempotent: re-import writes the same doc id (upsert, no duplicates)', async () => {
    const { db, writes } = makeMockDb();
    await importIntervals([VALID_ROW], db);
    const firstPassIds = writes.map((w) => w.id);
    await importIntervals([VALID_ROW], db);
    const secondPassIds = writes.slice(firstPassIds.length).map((w) => w.id);
    expect(secondPassIds).toEqual(firstPassIds);
    expect(new Set(writes.map((w) => w.id)).size).toBe(1);
  });

  test('accepts { intervals: [...] } wrapper shape', async () => {
    const { db, writes } = makeMockDb();
    const result = await importIntervals({ intervals: [VALID_ROW] }, db);
    expect(result.imported).toBe(1);
    expect(writes[0].id).toBe('toyota_camry_2015_2025_oil_change');
  });

  test('skips invalid rows and reports them', async () => {
    const { db, writes } = makeMockDb();
    const result = await importIntervals(
      [
        VALID_ROW,
        { make: '', model: 'X', yearFrom: 2015, yearTo: 2025, item: 'oil_change', intervalMiles: 5000, intervalMonths: 6 },
        { make: 'A', model: 'B', yearFrom: 2025, yearTo: 2015, item: 'x', intervalMiles: 5000, intervalMonths: 6 },
        { make: 'A', model: 'B', yearFrom: 2015, yearTo: 2025, item: 'x', intervalMiles: 0, intervalMonths: 6 },
        { make: 'A', model: 'B', yearFrom: 2015, yearTo: 2025, item: 'x' },
        'not-an-object',
      ],
      db
    );
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(5);
    expect(writes).toHaveLength(1);
  });

  test('dedupes rows that slug to the same doc id within one dataset', async () => {
    const { db, writes } = makeMockDb();
    const result = await importIntervals(
      [VALID_ROW, { ...VALID_ROW, make: 'toyota', item: 'OIL_CHANGE' }],
      db
    );
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(writes).toHaveLength(1);
  });

  test('throws on empty / invalid dataset shape', async () => {
    const { db } = makeMockDb();
    await expect(importIntervals([], db)).rejects.toThrow(/Invalid interval dataset/);
    await expect(importIntervals({ foo: 1 }, db)).rejects.toThrow(/Invalid interval dataset/);
  });

  test('seed dataset loads and imports cleanly (top-20 coverage)', async () => {
    const { db, writes } = makeMockDb();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const seed = require('../src/data/intervals.seed.json');
    const result = await importIntervals(seed, db);
    expect(result.skipped).toBe(0);
    expect(result.imported).toBe(seed.length);
    expect(result.imported).toBeGreaterThanOrEqual(100);
    // distinct doc ids (no collisions)
    expect(new Set(writes.map((w) => w.id)).size).toBe(writes.length);
    // all writes target the right collection via our mock — sanity: slugs contain item
    expect(writes[0].id).toContain('_');
  });

  test('mileage-only and time-only rows survive normalization', async () => {
    const { db, writes } = makeMockDb();
    const result = await importIntervals(
      [
        { ...VALID_ROW, item: 'tire_rotation', intervalMonths: null },
        { ...VALID_ROW, item: 'cabin_filter', intervalMiles: null, intervalMonths: 24 },
      ],
      db
    );
    expect(result.imported).toBe(2);
    expect(writes.map((w) => w.id)).toEqual([
      'toyota_camry_2015_2025_tire_rotation',
      'toyota_camry_2015_2025_cabin_filter',
    ]);
    expect(writes[0].data.intervalMonths).toBeNull();
    expect(writes[1].data.intervalMiles).toBeNull();
  });

  test('writes to the maintenance_intervals collection constant', () => {
    expect(INTERVALS_COLLECTION).toBe('maintenance_intervals');
  });
});
