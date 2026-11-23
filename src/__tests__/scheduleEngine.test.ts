/**
 * T4.2 (FR-3.2/FR-3.3/FR-3.5): schedule engine unit tests — pure logic, no RN.
 *
 * Covers: due-soon boundaries (exactly 500 mi / 14 days, inclusive),
 * auto-complete-on-entry at the entry odometer, fuzzy serviceType
 * matching, and the ok default.
 */

import {
  autoCompleteOnEntry,
  computeScheduleState,
  DUE_SOON_MILES,
  matchesServiceType,
  type ScheduleStateItem,
  type ServiceEntryInput,
} from '../services/scheduleEngine';
import type { HistoryEntry, IntervalRow } from '../services/schedule-pure';

const NOW = 1_700_000_000_000; // fixed epoch ms
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_MS = 30.4375 * DAY_MS;

function interval(partial: Partial<IntervalRow> = {}): IntervalRow {
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

function stateItem(partial: Partial<ScheduleStateItem> = {}): ScheduleStateItem {
  return {
    item: 'oil_change',
    status: 'ok',
    dueMileage: null,
    dueTime: null,
    dueBy: null,
    ...partial,
  };
}

function entry(partial: Partial<ServiceEntryInput> = {}): ServiceEntryInput {
  return { date: NOW, odometer: 40000, serviceType: 'oil_change', ...partial };
}

const entries: HistoryEntry[] = [];

describe('computeScheduleState classification', () => {
  test('ok is the default when far from any due point', () => {
    const result = computeScheduleState(40000, entries, [interval()], NOW);
    expect(result).toHaveLength(1);
    // No history: due at 40000 + 10000 = 50000 mi, or NOW + 12 months.
    expect(result[0].status).toBe('ok');
    expect(result[0].dueMileage).toBe(50000);
  });

  test('overdue when past the mileage due point', () => {
    const last: HistoryEntry = { date: NOW - DAY_MS, odometer: 40000, serviceType: 'oil_change' };
    const result = computeScheduleState(50001, [last], [interval()], NOW);
    expect(result[0].status).toBe('overdue');
  });

  test('due-soon at exactly 500 miles remaining (inclusive)', () => {
    const last: HistoryEntry = { date: NOW - DAY_MS, odometer: 40000, serviceType: 'oil_change' };
    // Due at 50000; exactly 500 miles remaining at 49500.
    const result = computeScheduleState(50000 - DUE_SOON_MILES, [last], [interval()], NOW);
    expect(result[0].status).toBe('due-soon');
  });

  test('ok at 501 miles remaining (just outside window)', () => {
    const last: HistoryEntry = { date: NOW - DAY_MS, odometer: 40000, serviceType: 'oil_change' };
    const result = computeScheduleState(50000 - DUE_SOON_MILES - 1, [last], [interval()], NOW);
    expect(result[0].status).toBe('ok');
  });

  test('due-soon at exactly 14 days remaining (inclusive)', () => {
    // Time-only interval, one month; last done 1 month − 14 days ago so the
    // due time lands exactly NOW + 14 days.
    const last: HistoryEntry = {
      date: NOW + 14 * DAY_MS - MONTHS_MS,
      odometer: 40000,
      serviceType: 'oil_change',
    };
    const iv = interval({ intervalMiles: null, intervalMonths: 1 });
    const result = computeScheduleState(40000, [last], [iv], NOW);
    expect(result[0].status).toBe('due-soon');
  });

  test('ok at 15 days remaining (just outside window)', () => {
    const last: HistoryEntry = {
      date: NOW + 15 * DAY_MS - MONTHS_MS,
      odometer: 40000,
      serviceType: 'oil_change',
    };
    const iv = interval({ intervalMiles: null, intervalMonths: 1 });
    const result = computeScheduleState(40000, [last], [iv], NOW);
    expect(result[0].status).toBe('ok');
  });

  test('overdue when past the time due point', () => {
    const last: HistoryEntry = {
      date: NOW - 2 * MONTHS_MS,
      odometer: 40000,
      serviceType: 'oil_change',
    };
    const iv = interval({ intervalMiles: null, intervalMonths: 1 });
    const result = computeScheduleState(40000, [last], [iv], NOW);
    expect(result[0].status).toBe('overdue');
  });

  test('groups ordered overdue → due-soon → ok', () => {
    const ivs = [
      interval({ item: 'z_overdue', intervalMiles: 1000, intervalMonths: null }),
      interval({ item: 'a_ok', intervalMiles: 100000, intervalMonths: null }),
      interval({ item: 'm_soon', intervalMiles: 500, intervalMonths: null }),
    ];
    const history: HistoryEntry[] = [
      { date: NOW, odometer: 38000, serviceType: 'z_overdue' }, // due 39000 < 40000
      { date: NOW, odometer: 0, serviceType: 'a_ok' },
      { date: NOW, odometer: 39600, serviceType: 'm_soon' }, // due 40100 → due-soon,
    ];
    const result = computeScheduleState(40000, history, ivs, NOW);
    expect(result.map((r) => r.status)).toEqual([
      'overdue',
      'due-soon',
      'ok',
    ]);
  });
});

describe('matchesServiceType (fuzzy)', () => {
  test('"Oil Change" matches oil_change', () => {
    expect(matchesServiceType('Oil Change', 'oil_change')).toBe(true);
  });

  test('"OIL-CHANGE" matches oil_change', () => {
    expect(matchesServiceType('OIL-CHANGE', 'oil_change')).toBe(true);
  });

  test('"Tire Rotation" does not match oil_change', () => {
    expect(matchesServiceType('Tire Rotation', 'oil_change')).toBe(false);
  });
});

describe('autoCompleteOnEntry (FR-3.5)', () => {
  test('matching entry resets item to ok, re-projected from entry odometer', () => {
    const state = [stateItem({ status: 'overdue', dueMileage: 45000, dueTime: NOW, dueBy: 'both' })];
    const e = entry({ odometer: 60000, serviceType: 'Oil Change' });
    const result = autoCompleteOnEntry([interval()], e, state);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ok');
    expect(result[0].dueMileage).toBe(70000);
    expect(result[0].dueTime).toBeCloseTo(e.date + 12 * MONTHS_MS, -4);
    expect(result[0].dueBy).toBeNull();
  });

  test('fuzzy match: "oil change" entry completes oil_change item', () => {
    const state = [stateItem({ status: 'due-soon' })];
    const result = autoCompleteOnEntry(
      [interval()],
      entry({ serviceType: 'oil change' }),
      state
    );
    expect(result[0].status).toBe('ok');
  });

  test('non-matching items are unchanged', () => {
    const state = [
      stateItem({ item: 'tire_rotation', status: 'overdue', dueMileage: 41000 }),
    ];
    const result = autoCompleteOnEntry(
      [interval(), interval({ item: 'tire_rotation' })],
      entry({ serviceType: 'oil_change' }),
      state
    );
    expect(result[0].status).toBe('overdue');
    expect(result[0].dueMileage).toBe(41000);
  });

  test('does not mutate the input state', () => {
    const state = [stateItem({ status: 'overdue' })];
    autoCompleteOnEntry([interval()], entry(), state);
    expect(state[0].status).toBe('overdue');
  });

  test('no interval for entry service type leaves state unchanged', () => {
    const state = [stateItem({ status: 'due-soon', dueMileage: 48000 })];
    const result = autoCompleteOnEntry(
      [interval({ item: 'tire_rotation' })],
      entry({ serviceType: 'oil_change' }),
      state
    );
    expect(result).toEqual(state);
  });
});
