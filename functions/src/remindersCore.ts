/**
 * Pure core of the reminder pipeline (T4.3) — transport-free so unit tests
 * run with plain mocks (no firebase-functions / firebase-admin runtime).
 * The scheduled function + onCall wrapper live in ./reminders.
 *
 * Contract: given a user's per-vehicle schedule state (T4.2 classification
 * ok / due-soon / overdue) and the user's dedupe map, compute which
 * notifications to send NOW:
 *  - overdue items  → "overdue" notification
 *  - due-soon items → "due-soon" notification
 *  - already-notified items inside the dedupe window → skipped
 */

/** One schedule-state row (subset of T4.2 ScheduleStateItem + vehicle id). */
export interface ScheduleStateItemInput {
  item: string;
  status: 'ok' | 'due-soon' | 'overdue';
  dueMileage?: number | null;
  dueTime?: number | null;
  vehicleId: string;
}

/** A notification to send for one (vehicle, item) pair. */
export interface ReminderNotification {
  vehicleId: string;
  item: string;
  status: 'overdue' | 'due-soon';
}

/** One notification per (vehicle, item) per dedupe window (default 7 days). */
export const NOTIFICATION_DEDUPE_MS = 7 * 24 * 60 * 60 * 1000;

/** Mirror of T4.2 due-soon window (14 days) — for doc parity only. */
export const DUE_SOON_MS = 14 * 24 * 60 * 60 * 1000;

/** Dedupe map key for a (vehicle, item) pair. */
export function notificationKey(vehicleId: string, item: string): string {
  return `${vehicleId}:${item}`;
}

/**
 * Reminder preference (users/{uid}.remindersEnabled): enabled by default;
 * only an explicit boolean `false` opts the user out.
 */
export function isReminderEnabled(userData: Record<string, unknown> | undefined): boolean {
  return !(userData && userData.remindersEnabled === false);
}

/**
 * FCM token read from the user doc (users/{uid}.fcmToken).
 * Non-string / empty → null (graceful no-token handling).
 */
export function extractFcmToken(userData: Record<string, unknown> | undefined): string | null {
  if (!userData) return null;
  const t = userData.fcmToken;
  return typeof t === 'string' && t.length > 0 ? t : null;
}

/** Read the dedupe map from a user doc; malformed → empty map. */
export function extractLastNotifiedAt(
  userData: Record<string, unknown> | undefined
): Record<string, number> {
  const m = userData?.reminderLastNotifiedAt;
  return m && typeof m === 'object' && !Array.isArray(m)
    ? { ...(m as Record<string, number>) }
    : {};
}

/**
 * Pure decision core: which reminder notifications to send.
 *
 * @param scheduleStates  per-vehicle schedule state rows (status classified
 *                        upstream by the T4.2 engine).
 * @param lastNotifiedAt  user-doc dedupe map `{vehicleId}:{item}` → epoch ms
 *                        of the last notification sent for that item.
 * @param now             epoch ms reference for the dedupe window.
 * @returns notifications to send (overdue + due-soon), deduped against the
 *          window; 'ok' items are never included.
 */
export function computeReminders(
  scheduleStates: readonly ScheduleStateItemInput[],
  lastNotifiedAt: Record<string, number>,
  now: number = Date.now()
): ReminderNotification[] {
  const notifications: ReminderNotification[] = [];

  for (const s of scheduleStates) {
    if (s.status !== 'overdue' && s.status !== 'due-soon') {
      continue;
    }

    const key = notificationKey(s.vehicleId, s.item);
    const lastAt = Number(lastNotifiedAt[key]);
    if (Number.isFinite(lastAt) && now - lastAt < NOTIFICATION_DEDUPE_MS) {
      // Already notified inside the window — skip (dedupe).
      continue;
    }

    notifications.push({
      vehicleId: s.vehicleId,
      item: s.item,
      status: s.status,
    });
  }

  return notifications;
}
