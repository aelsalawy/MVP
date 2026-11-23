/**
 * Schedule computation engine (T4.2, FR-3.2/FR-3.3/FR-3.5).
 *
 * Builds on the pure `computeNextDue` from `schedule-pure.ts` (T4.1,
 * read-only) to produce the full per-item schedule state classification
 * (ok / due-soon / overdue) plus the auto-complete-on-entry rule applied
 * when a service entry is logged (manual or OCR).
 *
 * Pure logic only — no React Native / Firebase imports, so QA can unit
 * test this directly (src/__tests__/scheduleEngine.test.ts).
 */

import {
  computeNextDue,
  type HistoryEntry,
  type IntervalRow,
} from './schedule-pure';

/** Due-soon window (FR-3.3): within 500 miles (inclusive). */
export const DUE_SOON_MILES = 500;
/** Due-soon window (FR-3.3): within 14 days (inclusive). */
export const DUE_SOON_DAYS = 14;
const DUE_SOON_MS = DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

/** Per-item classification for the Schedule view. */
export type ScheduleStatus = 'ok' | 'due-soon' | 'overdue';

export interface ScheduleStateItem {
  /** Interval item key, e.g. "oil_change". */
  item: string;
  status: ScheduleStatus;
  /** Projected odometer at due (null when time-only). */
  dueMileage: number | null;
  /** Projected epoch-ms time at due (null when miles-only). */
  dueTime: number | null;
  /** Which constraint governs the due/overdue verdict ('both' = due by both). */
  dueBy: 'miles' | 'time' | 'both' | null;
}

/** Minimal entry view used for computation (subset of ServiceEntryDoc). */
export interface ServiceEntryInput {
  /** epoch ms */
  date: number;
  odometer: number;
  /** Service type; matched against interval `item` keys (fuzzy). */
  serviceType: string;
}

/**
 * Fuzzy serviceType → interval.item match, mirroring the private
 * `normalizeKey` in schedule-pure.ts (kept in sync deliberately).
 */
export function matchesServiceType(serviceType: string, intervalItem: string): boolean {
  return normalizeKey(serviceType) === normalizeKey(intervalItem);
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Build the full schedule state list for one vehicle (FR-3.2/FR-3.3).
 *
 * Classification:
 *  - overdue : already due at the current mileage/time (per computeNextDue)
 *  - due-soon: within 500 miles OR 14 days of a due point (inclusive)
 *  - ok      : everything else (default)
 *
 * Ordering: overdue first, then due-soon, then ok; nearest mileage due
 * within each group (inheriting computeNextDue's urgency sort).
 */
export function computeScheduleState(
  vehicleMileage: number,
  entries: readonly (HistoryEntry | ServiceEntryInput)[],
  intervals: readonly IntervalRow[],
  now: number = Date.now()
): ScheduleStateItem[] {
  const upcoming = computeNextDue(
    vehicleMileage,
    entries as readonly HistoryEntry[],
    intervals,
    now
  );

  const items: ScheduleStateItem[] = upcoming.map((u) => {
    let status: ScheduleStatus = 'ok';

    if (u.overdue) {
      status = 'overdue';
    } else {
      const milesRemaining =
        u.dueMileage == null ? null : u.dueMileage - vehicleMileage;
      const timeRemaining = u.dueTime == null ? null : u.dueTime - now;

      // Inclusive windows: exactly 500 mi or exactly 14 days counts as due-soon.
      const dueSoonByMiles =
        milesRemaining != null &&
        milesRemaining >= 0 &&
        milesRemaining <= DUE_SOON_MILES;
      const dueSoonByTime =
        timeRemaining != null &&
        timeRemaining >= 0 &&
        timeRemaining <= DUE_SOON_MS;

      if (dueSoonByMiles || dueSoonByTime) {
        status = 'due-soon';
      }
    }

    return {
      item: u.item,
      status,
      dueMileage: u.dueMileage,
      dueTime: u.dueTime,
      dueBy: u.dueBy,
    };
  });

  // Group-ordered: overdue → due-soon → ok (urgency preserved within group).
  const rank: Record<ScheduleStatus, number> = { overdue: 0, 'due-soon': 1, ok: 2 };
  items.sort((a, b) => rank[a.status] - rank[b.status]);
  return items;
}

/**
 * Auto-complete matching schedule items when a service entry is logged
 * (manual or OCR) — FR-3.5.
 *
 * Matching is fuzzy on serviceType (same normalization as schedule-pure):
 * an entry "Oil Change" completes the interval item `oil_change`.
 * The completed item's next due points are re-projected from the entry
 * (dueMileage = entry.odometer + intervalMiles, dueTime = entry.date +
 * intervalMonths) and its status is reset to 'ok' — it was just done at
 * the current odometer. Non-matching items are returned unchanged.
 *
 * @param intervals           manufacturer interval rows (source of interval sizes)
 * @param entry               the just-logged service entry
 * @param currentScheduleState current schedule state list (will not be mutated)
 */
export function autoCompleteOnEntry(
  intervals: readonly IntervalRow[],
  entry: ServiceEntryInput,
  currentScheduleState: readonly ScheduleStateItem[]
): ScheduleStateItem[] {
  return currentScheduleState.map((stateItem) => {
    const interval = intervals.find((i) => matchesServiceType(entry.serviceType, i.item));
    if (!interval || !matchesServiceType(entry.serviceType, stateItem.item)) {
      return stateItem;
    }

    const dueMileage =
      interval.intervalMiles == null ? null : entry.odometer + interval.intervalMiles;
    const dueTime =
      interval.intervalMonths == null
        ? null
        : entry.date + interval.intervalMonths * 30.4375 * 24 * 60 * 60 * 1000;

    return {
      ...stateItem,
      dueMileage,
      dueTime,
      dueBy: null,
      status: 'ok',
    };
  });
}
