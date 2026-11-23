/**
 * Factual rollup stats (T5.2, FR-4.2-adjacent).
 *
 * PURE computation module — no React Native / Firebase imports so it can be
 * unit-tested in a plain node environment (see src/__tests__/stats.test.ts).
 * Every value is derived from the passed entries; nothing is invented.
 */

/** Minimal entry shape the computations need (subset of ServiceEntryDoc). */
export interface StatsEntryInput {
  date: number; // epoch ms
  serviceType: string;
  costCents: number;
}

/** Per-service-type rollup. */
export interface ServiceTypeStats {
  serviceType: string;
  count: number;
  costCents: number;
  /** Average interval between consecutive same-type entries, in days.
   *  null when fewer than 2 entries of this type exist. */
  avgIntervalDays: number | null;
}

/** One bucket of the per-month cost series (UTC calendar month). */
export interface MonthlyCostPoint {
  /** 'YYYY-MM' (UTC). */
  month: string;
  costCents: number;
  count: number;
}

export interface VehicleStats {
  /** Total number of entries. */
  count: number;
  /** Lifetime sum of costCents. */
  totalCostCents: number;
  /** Average cost per entry, cents (0 when no entries). */
  avgCostCents: number;
  /** Per-service-type breakdown (sorted by lifetime cost desc). */
  byType: ServiceTypeStats[];
  /** Entries whose UTC calendar year === current year. */
  thisYear: { count: number; costCents: number };
  /** The UTC calendar year "this year" refers to (from `now`). */
  thisYearValue: number;
  /** Last 12 UTC months ending with the month of `now`, oldest first.
   *  Buckets with no entries still appear with costCents 0. */
  monthlySeries: MonthlyCostPoint[];
}

/** Milliseconds per day (UTC — constant, DST-ignorant by design). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Format an epoch-ms timestamp as a UTC 'YYYY-MM' month key. */
export function monthKey(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Average interval in days between consecutive entries of the same type,
 * using simple UTC day-difference date math (local to this module —
 * deliberately NOT the schedule engine, which deals in due predictions).
 * Entries must be given oldest→newest or the result is meaningless;
 * callers pass date-desc lists, so we sort defensively.
 */
export function avgIntervalDays(datesDesc: number[]): number | null {
  if (datesDesc.length < 2) return null;
  const dates = [...datesDesc].sort((a, b) => a - b);
  let totalMs = 0;
  for (let i = 1; i < dates.length; i += 1) {
    totalMs += dates[i] - dates[i - 1];
  }
  return totalMs / (dates.length - 1) / MS_PER_DAY;
}

/** Compute all factual rollups over a vehicle's entries. */
export function computeStats(
  entries: StatsEntryInput[],
  now: number = Date.now()
): VehicleStats {
  const count = entries.length;
  const totalCostCents = entries.reduce((sum, e) => sum + (e.costCents || 0), 0);
  const avgCostCents = count > 0 ? Math.round(totalCostCents / count) : 0;

  // Per-type grouping.
  const groups = new Map<string, { dates: number[]; costCents: number }>();
  for (const e of entries) {
    const g = groups.get(e.serviceType) ?? { dates: [], costCents: 0 };
    g.dates.push(e.date);
    g.costCents += e.costCents || 0;
    groups.set(e.serviceType, g);
  }

  const byType: ServiceTypeStats[] = [...groups.entries()]
    .map(([serviceType, g]) => ({
      serviceType,
      count: g.dates.length,
      costCents: g.costCents,
      avgIntervalDays: avgIntervalDays(g.dates),
    }))
    .sort((a, b) => b.costCents - a.costCents || a.serviceType.localeCompare(b.serviceType));

  // This-year vs lifetime split (UTC calendar year).
  const thisYearValue = new Date(now).getUTCFullYear();
  const thisYearEntries = entries.filter(
    (e) => new Date(e.date).getUTCFullYear() === thisYearValue
  );
  const thisYearCostCents = thisYearEntries.reduce(
    (sum, e) => sum + (e.costCents || 0),
    0
  );

  // Per-month cost series: 12 UTC buckets ending with the month of `now`.
  const buckets = new Map<string, { costCents: number; count: number }>();
  const monthlySeries: MonthlyCostPoint[] = [];
  const nowDate = new Date(now);
  for (let i = 11; i >= 0; i -= 1) {
    const monthStart = new Date(
      Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - i, 1)
    );
    const key = monthKey(monthStart.getTime());
    buckets.set(key, { costCents: 0, count: 0 });
    monthlySeries.push({ month: key, costCents: 0, count: 0 });
  }
  for (const e of entries) {
    const b = buckets.get(monthKey(e.date));
    if (b) {
      b.costCents += e.costCents || 0;
      b.count += 1;
    }
  }
  for (const point of monthlySeries) {
    const b = buckets.get(point.month);
    if (b) {
      point.costCents = b.costCents;
      point.count = b.count;
    }
  }

  return {
    count,
    totalCostCents,
    avgCostCents,
    byType,
    thisYear: { count: thisYearEntries.length, costCents: thisYearCostCents },
    thisYearValue,
    monthlySeries,
  };
}
