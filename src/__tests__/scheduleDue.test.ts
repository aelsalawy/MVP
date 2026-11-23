/**
 * T4.1 (FR-3.1): getNextDue / computeNextDue unit tests — pure logic, no RN.
 */

import {
  computeNextDue,
  type HistoryEntry,
  type IntervalRow,
} from '../services/schedule-pure';

const NOW = 1_700_000_000_000; // fixed epoch ms
const MONTHS_MS = 30.4375 * 24 * 60 * 60 * 1000;

function interval(partial: Partial<IntervalRow>): IntervalRow {
  return {
    make: 'Toyota',
    model: 'Camry',
    yearFrom: 2015,
    yearTo: 2025,
    item: 'oil_change',
    intervalMiles: 10000,
    intervalMonths: 12,
    ...partial,
  };
}

function entry(partial: Partial<HistoryEntry>): HistoryEntry {
  return { date: NOW - 90 * 24 * 60 * 60 * 1000, odometer: 40000, serviceType: 'oil_change', ...partial };
}

describe('computeNextDue (T4.1, FR-3.1)', () => {
  test('projects from last entry: miles and time', () => {
    const items = computeNextDue(41000, [entry({})], [interval({})], NOW);
    expect(items).toHaveLength(1);
    const oil = items[0];
    expect(oil.item).toBe('oil_change');
    expect(oil.dueMileage).toBe(50000);
    expect(oil.dueTime).toBeCloseTo(entry({}).date + 12 * MONTHS_MS, -3);
    expect(oil.overdue).toBe(false);
    expect(oil.dueBy).toBeNull();
  });

  test('marks overdue when mileage passes due mileage', () => {
    const items = computeNextDue(51000, [entry({})], [interval({})], NOW);
    expect(items[0].overdue).toBe(true);
    expect(items[0].dueBy).toBe('miles');
  });

  test('marks overdue when time passes due time (time-only interval)', () => {
    // cabin filter: time-only; last done 13 months ago
    const items = computeNextDue(
      1000,
      [entry({ serviceType: 'cabin_air_filter', date: NOW - 13 * MONTHS_MS })],
      [interval({ item: 'cabin_air_filter', intervalMiles: null, intervalMonths: 12 })],
      NOW
    );
    expect(items[0].overdue).toBe(true);
    expect(items[0].dueBy).toBe('time');
    expect(items[0].dueMileage).toBeNull();
  });

  test('miles-only interval has no dueTime', () => {
    const items = computeNextDue(1000, [entry({ serviceType: 'tire_rotation' })], [
      interval({ item: 'tire_rotation', intervalMiles: 7500, intervalMonths: null }),
    ], NOW);
    expect(items[0].dueMileage).toBe(47500);
    expect(items[0].dueTime).toBeNull();
  });

  test('no history entry: interval measured from current mileage/now', () => {
    const items = computeNextDue(30000, [], [interval({})], NOW);
    expect(items[0].dueMileage).toBe(40000);
    expect(items[0].dueTime).toBeCloseTo(NOW + 12 * MONTHS_MS, -3);
    expect(items[0].overdue).toBe(false);
  });

  test('uses latest entry per item when history is out of order', () => {
    const items = computeNextDue(
      42000,
      [entry({ odometer: 38000 }), entry({ odometer: 40000, date: NOW - 10 * 24 * 60 * 60 * 1000 })],
      [interval({})],
      NOW
    );
    // latest by date = 10d-ago entry with 40000 odometer → due at 50000 (not 48000)
    expect(items[0].dueMileage).toBe(50000);
  });

  test('fuzzy serviceType matching: "Oil Change" matches oil_change', () => {
    const items = computeNextDue(41000, [entry({ serviceType: 'Oil Change' })], [interval({})], NOW);
    expect(items[0].dueMileage).toBe(50000);
  });

  test('dueBy "both" when overdue by miles and time', () => {
    const items = computeNextDue(
      99999,
      [entry({ odometer: 40000, date: NOW - 24 * MONTHS_MS })],
      [interval({})],
      NOW
    );
    expect(items[0].overdue).toBe(true);
    expect(items[0].dueBy).toBe('both');
  });

  test('sorts overdue items first, then by nearest due mileage', () => {
    const items = computeNextDue(
      45000,
      [
        entry({ serviceType: 'oil_change', odometer: 30000 }),
        entry({ serviceType: 'tire_rotation', odometer: 30000 }),
      ],
      [
        interval({ item: 'tire_rotation', intervalMiles: 5000, intervalMonths: null }),
        interval({ item: 'oil_change', intervalMiles: 10000, intervalMonths: 12 }),
        interval({ item: 'spark_plugs', intervalMiles: 120000, intervalMonths: null }),
      ],
      NOW
    );
    expect(items.map((i) => i.item)).toEqual(['tire_rotation', 'oil_change', 'spark_plugs']);
    // tire_rotation overdue (30000+5000 <= 45000), nearest due mileage
    expect(items[0].overdue).toBe(true);
    expect(items[0].dueMileage).toBe(35000);
    // oil_change overdue (30000+10000 <= 45000), due mileage farther
    expect(items[1].overdue).toBe(true);
    expect(items[1].dueMileage).toBe(40000);
    // spark_plugs never done → measured from current mileage, not due
    expect(items[2].overdue).toBe(false);
    expect(items[2].dueMileage).toBe(165000);
  });

  test('skips intervals with neither miles nor months', () => {
    const items = computeNextDue(50000, [], [
      interval({ item: 'unknown', intervalMiles: null, intervalMonths: null }),
    ], NOW);
    expect(items).toHaveLength(0);
  });

  test('empty intervals yield empty list', () => {
    expect(computeNextDue(50000, [entry({})], [], NOW)).toEqual([]);
  });
});
