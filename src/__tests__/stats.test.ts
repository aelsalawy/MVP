/**
 * Pure unit tests for src/services/stats.ts (T5.2).
 * No RN/Firebase imports — plain jest.
 */
import {
  computeStats,
  avgIntervalDays,
  monthKey,
  StatsEntryInput,
} from '../services/stats';

const DAY = 24 * 60 * 60 * 1000;

/** Fixed "now": 2026-11-23T12:00:00Z. */
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

function entry(date: number, serviceType = 'maintenance', costCents = 10000): StatsEntryInput {
  return { date, serviceType, costCents };
}

describe('computeStats — empty state', () => {
  it('returns zeroed totals for no entries', () => {
    const s = computeStats([], NOW);
    expect(s.count).toBe(0);
    expect(s.totalCostCents).toBe(0);
    expect(s.avgCostCents).toBe(0);
    expect(s.byType).toEqual([]);
    expect(s.thisYear.count).toBe(0);
    expect(s.thisYear.costCents).toBe(0);
    expect(s.thisYearValue).toBe(2026);
  });

  it('still emits 12 monthly buckets with zero cost', () => {
    const s = computeStats([], NOW);
    expect(s.monthlySeries).toHaveLength(12);
    expect(s.monthlySeries[0].month).toBe('2025-12');
    expect(s.monthlySeries[11].month).toBe('2026-11');
    expect(s.monthlySeries.every((p) => p.costCents === 0 && p.count === 0)).toBe(true);
  });
});

describe('computeStats — single entry', () => {
  it('summarizes one entry correctly', () => {
    const date = Date.UTC(2026, 5, 10);
    const s = computeStats([entry(date, 'repair', 5000)], NOW);
    expect(s.count).toBe(1);
    expect(s.totalCostCents).toBe(5000);
    expect(s.avgCostCents).toBe(5000);
    expect(s.byType).toHaveLength(1);
    expect(s.byType[0]).toMatchObject({
      serviceType: 'repair',
      count: 1,
      costCents: 5000,
      avgIntervalDays: null,
    });
    expect(s.thisYear.count).toBe(1);
    expect(s.thisYear.costCents).toBe(5000);
    // June 2026 lands in the monthly series bucket.
    const jun = s.monthlySeries.find((p) => p.month === '2026-06');
    expect(jun).toMatchObject({ costCents: 5000, count: 1 });
  });
});

describe('computeStats — same-type interval average', () => {
  it('averages intervals between same-type entries (ignores other types)', () => {
    const oil = (day: number) => entry(Date.UTC(2026, 0, day), 'maintenance', 6000);
    // maintenance on Jan 1, Feb 1 (31 days later), Mar 3 (30 days later)
    const s = computeStats(
      [
        oil(1),
        oil(1 + 31),
        oil(1 + 31 + 30),
        entry(Date.UTC(2026, 0, 15), 'repair', 9000), // must not affect interval
      ],
      NOW
    );
    const maint = s.byType.find((t) => t.serviceType === 'maintenance');
    expect(maint).toBeDefined();
    expect(maint!.count).toBe(3);
    expect(maint!.avgIntervalDays).toBeCloseTo(30.5, 6); // (31 + 30) / 2
    const repair = s.byType.find((t) => t.serviceType === 'repair')!;
    expect(repair.avgIntervalDays).toBeNull();
  });

  it('handles input given newest-first (defensive sort)', () => {
    const dates = [Date.UTC(2026, 2, 3), Date.UTC(2026, 1, 1), Date.UTC(2026, 0, 1)];
    const s = computeStats(dates.map((d) => entry(d)), NOW);
    expect(s.byType[0].avgIntervalDays).toBeCloseTo(30.5, 6);
  });

  it('avgIntervalDays direct: null under 2 dates', () => {
    expect(avgIntervalDays([])).toBeNull();
    expect(avgIntervalDays([123])).toBeNull();
    expect(avgIntervalDays([0, DAY * 10])).toBe(10);
  });
});

describe('computeStats — month bucketing across year boundary', () => {
  it('buckets Dec 2025 and Jan 2026 into the trailing-12 series (Nov 2025 is outside)', () => {
    const s = computeStats(
      [
        entry(Date.UTC(2025, 10, 20), 'repair', 2000), // Nov 2025 — outside window
        entry(Date.UTC(2025, 11, 25), 'maintenance', 1000), // Dec 2025
        entry(Date.UTC(2026, 0, 5), 'repair', 3000), // Jan 2026
      ],
      NOW
    );
    expect(monthKey(Date.UTC(2025, 10, 20))).toBe('2025-11');
    const nov25 = s.monthlySeries.find((p) => p.month === '2025-11');
    const dec25 = s.monthlySeries.find((p) => p.month === '2025-12');
    const jan26 = s.monthlySeries.find((p) => p.month === '2026-01');
    expect(nov25).toBeUndefined(); // window starts at 2025-12
    expect(dec25).toMatchObject({ costCents: 1000, count: 1 });
    expect(jan26).toMatchObject({ costCents: 3000, count: 1 });
    // Series spans the year boundary, oldest first.
    expect(s.monthlySeries[0].month).toBe('2025-12');
    expect(s.monthlySeries[11].month).toBe('2026-11');
  });

  it('ignores entries older than the 12-month window', () => {
    const s = computeStats([entry(Date.UTC(2024, 10, 20), 'repair', 99000)], NOW);
    // Still lifetime totals…
    expect(s.totalCostCents).toBe(99000);
    // …but excluded from the monthly series (oldest bucket is 2025-12).
    expect(s.monthlySeries.every((p) => p.costCents === 0)).toBe(true);
  });

  it('splits costs when multiple entries share a month', () => {
    const s = computeStats(
      [
        entry(Date.UTC(2026, 9, 1), 'repair', 100),
        entry(Date.UTC(2026, 9, 20), 'maintenance', 250),
      ],
      NOW
    );
    const oct = s.monthlySeries.find((p) => p.month === '2026-10')!;
    expect(oct.costCents).toBe(350);
    expect(oct.count).toBe(2);
  });
});

describe('computeStats — this-year vs lifetime split', () => {
  it('separates current-year entries from prior years', () => {
    const s = computeStats(
      [
        entry(Date.UTC(2025, 5, 1), 'maintenance', 12000), // last year
        entry(Date.UTC(2026, 0, 1), 'maintenance', 8000), // this year
        entry(Date.UTC(2026, 10, 1), 'repair', 4000), // this year
        entry(Date.UTC(2026, 11, 31, 23, 59, 59), 'repair', 500), // still this year (UTC)
      ],
      NOW
    );
    expect(s.count).toBe(4);
    expect(s.totalCostCents).toBe(24500);
    expect(s.thisYear.count).toBe(3);
    expect(s.thisYear.costCents).toBe(12500);
    expect(s.thisYearValue).toBe(2026);
    // byType sorts by cost desc: maintenance (20000) then repair (4500).
    expect(s.byType.map((t) => t.serviceType)).toEqual(['maintenance', 'repair']);
  });

  it('uses the UTC year boundary (Dec 31 vs Jan 1)', () => {
    const s = computeStats(
      [
        entry(Date.UTC(2026, 11, 31, 23, 59, 59), 'fuel', 100),
        entry(Date.UTC(2027, 0, 1, 0, 0, 0), 'fuel', 200),
      ],
      NOW
    );
    expect(s.thisYear.count).toBe(1);
    expect(s.thisYear.costCents).toBe(100);
    expect(s.totalCostCents).toBe(300);
  });

  it('handles negative / zero-cost entries without corrupting sums', () => {
    const s = computeStats(
      [entry(Date.UTC(2026, 2, 1), 'repair', 0), entry(Date.UTC(2026, 3, 1), 'repair', -500)],
      NOW
    );
    expect(s.totalCostCents).toBe(-500);
    expect(s.count).toBe(2);
    expect(s.avgCostCents).toBe(-250);
  });
});
