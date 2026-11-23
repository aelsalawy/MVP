/**
 * Firebase Cloud Functions for Car Tracker MVP.
 *
 * This is the server-side companion to the Expo app. It hosts background work
 * (FCM push notifications, scheduled reminders, data fan-out) that must not run
 * on-device. Deploy with `firebase deploy --only functions`.
 *
 * Note: functions are written in TypeScript and built to `lib/` before deploy.
 * See firebase.json for the emulator configuration.
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';

admin.initializeApp();

export const helloWorld = onRequest((_req, res) => {
  res.json({ ok: true, service: 'car-tracker-functions' });
});

// T4.1 (FR-3.1): manufacturer interval ingestion + seed import callable.
export { importIntervals, importIntervalsFn } from './intervals';

// T7.2 (FR-2.2, D3.1): OCR parse callable with server-side metering gate.
export { wrapOcrParse } from './ocrParse';

// T4.3 (FR-3.4): push reminder pipeline — pure core + scheduled sweep + callable.
export {
  sendScheduledReminders,
  sendReminder,
  sendFcmToUid,
} from './reminders';
export { computeReminders } from './remindersCore';
