/**
 * Schedule store (T4.2, FR-3.2/FR-3.3/FR-3.5).
 *
 * Client-side zustand store holding the current vehicle's schedule state
 * list (ok / due-soon / overdue classification). Computation is pure
 * (src/services/scheduleEngine.ts); this store wires it to app state and
 * exposes an `applyEntry` action for auto-complete-on-entry used by the
 * manual-entry and OCR flows.
 */

import { create } from 'zustand';
import {
  computeScheduleState,
  autoCompleteOnEntry,
  type ScheduleStateItem,
  type ServiceEntryInput,
} from '../services/scheduleEngine';
import type { IntervalRow } from '../services/schedule-pure';

/** Context the store needs to compute a schedule. */
export interface ScheduleContext {
  vehicleMileage: number;
  /** Service history (latest per item derived internally). */
  entries: ServiceEntryInput[];
  intervals: IntervalRow[];
  /** epoch ms; defaults to Date.now() at compute time. */
  now?: number;
}

interface ScheduleState {
  /** Items sorted overdue → due-soon → ok. */
  items: ScheduleStateItem[];
  /** Vehicle mileage the current items were computed against. */
  mileage: number;
  /** Recompute the full schedule from a context snapshot. */
  compute: (ctx: ScheduleContext) => void;
  /**
   * FR-3.5: log a service entry (manual or OCR) and auto-complete the
   * matching schedule item at the entry's odometer.
   */
  applyEntry: (entry: ServiceEntryInput, intervals: readonly IntervalRow[]) => void;
  reset: () => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  items: [],
  mileage: 0,
  compute: (ctx) =>
    set({
      items: computeScheduleState(
        ctx.vehicleMileage,
        ctx.entries,
        ctx.intervals,
        ctx.now ?? Date.now()
      ),
      mileage: ctx.vehicleMileage,
    }),
  applyEntry: (entry, intervals) =>
    set((s) => ({
      items: autoCompleteOnEntry(intervals, entry, s.items),
      mileage: entry.odometer,
    })),
  reset: () => set({ items: [], mileage: 0 }),
}));
