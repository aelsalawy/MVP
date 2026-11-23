/**
 * Pure due-date computation for maintenance schedules (T4.1, FR-3.1).
 *
 * No React Native / Firebase imports — QA can unit-test this directly.
 * Consumed by `src/services/intervals.ts` (Firestore-facing wrapper).
 */

import type { ServiceEntryDoc } from '../types';

/** Interval row (subset of the Firestore doc used by the client). */
export interface IntervalRow {
  make: string;
  model: string;
  /** Inclusive model-year range. */
  yearFrom: number;
  yearTo: number;
  /** snake_case schedule item key, e.g. "oil_change". */
  item: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
}

/** One computed upcoming item. */
export interface UpcomingDueItem {
  item: string;
  /** Projected odometer reading at which the item comes due (mile-based; null if time-only). */
  dueMileage: number | null;
  /** Projected epoch-ms time at which the item comes due (time-based; null if miles-only). */
  dueTime: number | null;
  /**
   * Which constraint governs: 'miles' | 'time' | 'both' (already due by both).
   * null when there is no basis to project (no last entry and no intervals).
   */
  dueBy: 'miles' | 'time' | 'both' | null;
  /** Whether the item is already due at the current mileage/time. */
  overdue: boolean;
}

/** Minimal entry view used for computation (subset of ServiceEntryDoc). */
export interface HistoryEntry {
  /** epoch ms */
  date: number;
  odometer: number;
  /** Service type; matched against interval `item` keys (snake_case-insensitive). */
  serviceType: string;
}

const MONTHS_MS = 30.4375 * 24 * 60 * 60 * 1000; // average month

/** Normalize a serviceType string to a comparable snake_case key. */
function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Compute upcoming due items for one vehicle.
 *
 * Rules:
 *  - For each interval item, find the latest matching history entry
 *    (by date). Matching is fuzzy on serviceType (e.g. "Oil Change"
 *    matches `oil_change`).
 *  - If a history entry exists: dueMileage = entry.odometer + intervalMiles,
 *    dueTime = entry.date + intervalMonths months. The governing constraint
 *    is whichever comes first.
 *  - If no history entry exists: the item is due in intervalMiles miles /
 *    intervalMonths months from the vehicle's current mileage and "now"
 *    (i.e. treated as never done).
 *  - Items with neither miles nor months defined are skipped.
 *
 * @param vehicleMileage - current odometer reading
 * @param lastEntries    - the vehicle's service entries (any subset shape ok)
 * @param intervals      - applicable manufacturer interval rows
 * @param now            - epoch ms reference for time-based due
 */
export function computeNextDue(
  vehicleMileage: number,
  lastEntries: readonly HistoryEntry[] | readonly ServiceEntryDoc[],
  intervals: readonly IntervalRow[],
  now: number = Date.now()
): UpcomingDueItem[] {
  // Latest entry per normalized serviceType key.
  const latestByKey = new Map<string, HistoryEntry>();
  for (const raw of lastEntries) {
    const entry: HistoryEntry = {
      date: Number(raw.date),
      odometer: Number(raw.odometer),
      serviceType: String(raw.serviceType ?? ''),
    };
    if (!Number.isFinite(entry.date) || !Number.isFinite(entry.odometer)) {
      continue;
    }
    const key = normalizeKey(entry.serviceType);
    const prev = latestByKey.get(key);
    if (!prev || entry.date > prev.date) {
      latestByKey.set(key, entry);
    }
  }

  const items: UpcomingDueItem[] = [];

  for (const interval of intervals) {
    if (interval.intervalMiles == null && interval.intervalMonths == null) {
      continue;
    }
    const key = normalizeKey(interval.item);
    const last = latestByKey.get(key) ?? null;

    let dueMileage: number | null;
    let dueTime: number | null;

    if (interval.intervalMiles != null) {
      dueMileage = (last ? last.odometer : vehicleMileage) + interval.intervalMiles;
    } else {
      dueMileage = null;
    }
    if (interval.intervalMonths != null) {
      dueTime = (last ? last.date : now) + interval.intervalMonths * MONTHS_MS;
    } else {
      dueTime = null;
    }

    const milesDue = dueMileage != null && vehicleMileage >= dueMileage;
    const timeDue = dueTime != null && now >= dueTime;

    const dueBy: UpcomingDueItem['dueBy'] =
      milesDue && timeDue ? 'both' : milesDue ? 'miles' : timeDue ? 'time' : null;

    const overdue = milesDue || timeDue;

    // If we cannot project anything at all (defensive), skip.
    if (dueMileage == null && dueTime == null) {
      continue;
    }

    items.push({
      item: interval.item,
      dueMileage,
      dueTime,
      dueBy,
      overdue,
    });
  }

  // Most urgent first: overdue items, then nearest mileage due.
  items.sort((a, b) => {
    if (a.overdue !== b.overdue) {
      return a.overdue ? -1 : 1;
    }
    const aMiles = a.dueMileage ?? Number.MAX_SAFE_INTEGER;
    const bMiles = b.dueMileage ?? Number.MAX_SAFE_INTEGER;
    return aMiles - bMiles;
  });

  return items;
}
