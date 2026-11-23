/**
 * Push notification pipeline for maintenance reminders (T4.3, FR-3.4).
 *
 * Follows the pure-core + thin-transport tiering used by ./metering +
 * ./ocrParseCore: all decision logic lives in transport-free functions that
 * unit tests can exercise with plain mocks (no firebase-functions runtime
 * needed in tests). Only the onCall / onSchedule wrappers touch
 * firebase-functions + firebase-admin messaging.
 *
 * Data conventions (documented; minimal additions to src/types/index.ts):
 *  - users/{uid}.remindersEnabled   : boolean (default true) — reminder opt-out.
 *  - users/{uid}.fcmToken            : string | undefined   — device push token.
 *  - users/{uid}.reminderLastNotifiedAt : Record<string, number> — map of
 *    `{vehicleId}:{item}` → epoch ms of the last notification sent for that
 *    due item. Dedupe rule: one notification per (vehicle, item) per
 *    NOTIFICATION_DEDUPE_WINDOW (a notification sent inside the window is
 *    not re-sent; the map is stored on the USER doc, chosen because the
 *    scheduler iterates users and this avoids cross-collection writes).
 *
 * Timezone handling: the scheduled function runs daily at 09:00 in the
 * Cloud Function's configured time zone (default 'America/New_York' — set
 * via `timeZone` in the onSchedule options; single-tz MVP trade-off since
 * Firestore does not store a per-user tz). Per-user local-time delivery
 * would need a users.tz field + per-tz schedulers; documented as future
 * work. FCM delivery itself is push (instant once sent).
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  computeReminders,
  ReminderNotification,
  ScheduleStateItemInput,
  isReminderEnabled,
  extractFcmToken,
  extractLastNotifiedAt,
} from './remindersCore';

/** Users collection (matches firestore.rules: users/{uid}). */
const USERS = 'users';
/** Vehicles collection (matches firestore.rules: vehicles/{vehicleId}). */
const VEHICLES = 'vehicles';

/**
 * Send an FCM message to a user's device via their stored token.
 * Graceful no-token handling: users/{uid}.fcmToken missing/empty → skipped
 * (logged, no throw) — the caller treats it as a no-op, not an error.
 */
export async function sendFcmToUid(
  uid: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<boolean> {
  const db = admin.firestore();
  const snap = await db.collection(USERS).doc(uid).get();
  if (!snap.exists) {
    console.warn(`sendFcmToUid: no user doc for ${uid}; skipping`);
    return false;
  }
  const token = extractFcmToken(snap.data());
  if (!token) {
    console.info(`sendFcmToUid: user ${uid} has no fcmToken; skipping`);
    return false;
  }

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
    });
    return true;
  } catch (err) {
    // Delivery failure is logged, never fatal to the sweep.
    console.error(`sendFcmToUid: FCM send failed for ${uid}`, err);
    return false;
  }
}

/**
 * Daily reminder sweep (T4.3). Runs at 09:00 in the function's configured
 * time zone (see module docs above for tz handling). For every user:
 *  - skip if remindersEnabled === false (default true),
 *  - compute the reminder notifications from their vehicles' schedule state,
 *  - dedupe items already notified inside the dedupe window,
 *  - send each notification via sendFcmToUid,
 *  - record lastNotifiedAt on the user doc for the sent items.
 */
export const sendScheduledReminders = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/New_York', // 09:00 user-local approximation (single-tz MVP)
  },
  async () => {
    const db = admin.firestore();
    const usersSnap = await db.collection(USERS).get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data() ?? {};

      // Reminder preference: enabled by default; explicit false opts out.
      if (!isReminderEnabled(userData)) {
        continue;
      }

      const lastNotifiedAt: Record<string, number> = extractLastNotifiedAt(userData);
      const now = Date.now();

      // Vehicles owned by this user, then their schedule states.
      const vehiclesSnap = await db
        .collection(VEHICLES)
        .where('ownerId', '==', uid)
        .get();
      if (vehiclesSnap.empty) {
        continue;
      }

      const scheduleStates: ScheduleStateItemInput[] = [];
      const vehicleNames: Record<string, string> = {};
      for (const v of vehiclesSnap.docs) {
        const vData = v.data() ?? {};
        vehicleNames[v.id] = `${vData.year ?? ''} ${vData.make ?? ''} ${vData.model ?? ''}`.trim();
        for (const state of (vData.scheduleState ?? []) as ScheduleStateItemInput[]) {
          scheduleStates.push({ ...state, vehicleId: v.id });
        }
      }

      const notifications = computeReminders(scheduleStates, lastNotifiedAt, now);

      const sentKeys: string[] = [];
      for (const n of notifications) {
        const vehicleLabel = vehicleNames[n.vehicleId] || 'your vehicle';
        const sent = await sendFcmToUid(
          uid,
          n.status === 'overdue' ? 'Overdue maintenance' : 'Maintenance due soon',
          `${vehicleLabel}: ${n.item.replace(/_/g, ' ')} is ${n.status === 'overdue' ? 'overdue' : 'due soon'}.`,
          {
            vehicleId: n.vehicleId,
            item: n.item,
            status: n.status,
          }
        );
        if (sent) {
          sentKeys.push(`${n.vehicleId}:${n.item}`);
        }
      }

      if (sentKeys.length > 0) {
        const updates: Record<string, number> = {};
        for (const key of sentKeys) {
          updates[key] = now;
        }
        await userDoc.ref.set({ reminderLastNotifiedAt: updates }, { merge: true });
      }
    }
  }
);

/**
 * sendReminder onCall (T4.3): lets the client trigger a reminder pass for the
 * CALLING user only (e.g. "test my notifications" or a foreground refresh).
 * Auth-required. Returns the notifications that would be/were sent.
 */
export const sendReminder = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required for reminders');
  }
  const uid = request.auth.uid;

  const db = admin.firestore();
  const userSnap = await db.collection(USERS).doc(uid).get();
  const userData = userSnap.data() ?? {};

  if (!isReminderEnabled(userData)) {
    return { notifications: [] as ReminderNotification[], remindersEnabled: false };
  }

  const lastNotifiedAt: Record<string, number> = extractLastNotifiedAt(userData);
  const now = Date.now();

  const vehiclesSnap = await db.collection(VEHICLES).where('ownerId', '==', uid).get();

  const scheduleStates: ScheduleStateItemInput[] = [];
  for (const v of vehiclesSnap.docs) {
    for (const state of (v.data().scheduleState ?? []) as ScheduleStateItemInput[]) {
      scheduleStates.push({ ...state, vehicleId: v.id });
    }
  }

  const notifications = computeReminders(scheduleStates, lastNotifiedAt, now);

  const sentKeys: string[] = [];
  for (const n of notifications) {
    const sent = await sendFcmToUid(
      uid,
      n.status === 'overdue' ? 'Overdue maintenance' : 'Maintenance due soon',
      `${n.item.replace(/_/g, ' ')} is ${n.status === 'overdue' ? 'overdue' : 'due soon'}.`,
      { vehicleId: n.vehicleId, item: n.item, status: n.status }
    );
    if (sent) {
      sentKeys.push(`${n.vehicleId}:${n.item}`);
    }
  }

  if (sentKeys.length > 0) {
    const updates: Record<string, number> = {};
    for (const key of sentKeys) {
      updates[key] = now;
    }
    await db
      .collection(USERS)
      .doc(uid)
      .set({ reminderLastNotifiedAt: updates }, { merge: true });
  }

  return { notifications, remindersEnabled: true };
});
