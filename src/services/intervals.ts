/**
 * Client-side maintenance schedule service (T4.1, FR-3.1).
 *
 * Reads manufacturer interval rows from Firestore collection
 * `maintenance_intervals` and computes upcoming due items for a vehicle.
 *
 * Pure logic lives in `src/services/schedule-pure.ts` so QA can test the
 * due-computation without React Native.
 */

import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';
import type { ServiceEntryDoc } from '../types';
import { computeNextDue, type IntervalRow, type UpcomingDueItem } from './schedule-pure';

export { computeNextDue } from './schedule-pure';
export type { IntervalRow, UpcomingDueItem } from './schedule-pure';

/** Firestore collection holding interval rows (mirrors functions/src/intervals.ts). */
export const INTERVALS_COLLECTION = 'maintenance_intervals';

/**
 * Fetch the interval rows matching a vehicle's make/model/year.
 * Falls back to an empty list when no schedule is available (e.g. a make
 * not yet covered by the seed dataset) — the app treats "no schedule" as
 * "no reminders", not an error.
 */
export async function fetchIntervals(
  make: string,
  model: string,
  year: number
): Promise<IntervalRow[]> {
  try {
    const db = getFirestore();
    const snapshot = await getDocs(
      query(
        collection(db, INTERVALS_COLLECTION),
        where('make', '==', make),
        where('model', '==', model)
      )
    );
    const rows: IntervalRow[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = {
        make: data.make,
        model: data.model,
        yearFrom: Number(data.yearFrom),
        yearTo: Number(data.yearTo),
        item: String(data.item),
        intervalMiles: data.intervalMiles == null ? null : Number(data.intervalMiles),
        intervalMonths: data.intervalMonths == null ? null : Number(data.intervalMonths),
      };
      if (year >= row.yearFrom && year <= row.yearTo) {
        rows.push(row);
      }
    });
    return rows;
  } catch {
    return [];
  }
}

/**
 * Compute upcoming maintenance items for a vehicle, combining its
 * manufacturer intervals with its service history.
 *
 * @param vehicleMileage - current odometer reading
 * @param lastEntries    - the vehicle's service entries (any order; the
 *   latest per item is derived internally)
 * @param intervals      - manufacturer interval rows for this vehicle
 * @param now            - epoch ms "now" (default Date.now()) for time-based due
 */
export function getNextDue(
  vehicleMileage: number,
  lastEntries: ServiceEntryDoc[],
  intervals: IntervalRow[],
  now: number = Date.now()
): UpcomingDueItem[] {
  return computeNextDue(vehicleMileage, lastEntries, intervals, now);
}
