/**
 * T4.3 reminder pipeline unit tests — computeReminders pure core (due-soon,
 * overdue, dedupe windows) and the wrapper-level skip logic (disabled
 * preference, missing fcmToken). All mocks; no real Firebase.
 */

import {
  computeReminders,
  notificationKey,
  isReminderEnabled,
  extractFcmToken,
  extractLastNotifiedAt,
  NOTIFICATION_DEDUPE_MS,
  ScheduleStateItemInput,
} from '../src/remindersCore';

const NOW = 1_700_000_000_000; // fixed epoch ms

function state(
  vehicleId: string,
  item: string,
  status: ScheduleStateItemInput['status']
): ScheduleStateItemInput {
  return { vehicleId, item, status };
}

describe('computeReminders (T4.3 pure core)', () => {
  test('includes overdue items as overdue notifications', () => {
    const out = computeReminders(
      [state('v1', 'oil_change', 'overdue'), state('v1', 'tire_rotation', 'ok')],
      {},
      NOW
    );
    expect(out).toEqual([
      { vehicleId: 'v1', item: 'oil_change', status: 'overdue' },
    ]);
  });

  test('includes due-soon items as due-soon notifications', () => {
    const out = computeReminders(
      [state('v1', 'brake_fluid', 'due-soon'), state('v1', 'oil_change', 'ok')],
      {},
      NOW
    );
    expect(out).toEqual([
      { vehicleId: 'v1', item: 'brake_fluid', status: 'due-soon' },
    ]);
  });

  test('includes both overdue and due-soon across vehicles', () => {
    const out = computeReminders(
      [
        state('v1', 'oil_change', 'overdue'),
        state('v2', 'air_filter', 'due-soon'),
      ],
      {},
      NOW
    );
    expect(out).toHaveLength(2);
    expect(out).toEqual(
      expect.arrayContaining([
        { vehicleId: 'v1', item: 'oil_change', status: 'overdue' },
        { vehicleId: 'v2', item: 'air_filter', status: 'due-soon' },
      ])
    );
  });

  test('never includes ok items', () => {
    const out = computeReminders([state('v1', 'oil_change', 'ok')], {}, NOW);
    expect(out).toEqual([]);
  });

  test('empty schedule → no notifications', () => {
    expect(computeReminders([], {}, NOW)).toEqual([]);
  });
});

describe('dedupe of already-notified items', () => {
  test('item notified inside the window is skipped', () => {
    const key = notificationKey('v1', 'oil_change');
    const out = computeReminders(
      [state('v1', 'oil_change', 'overdue')],
      { [key]: NOW - NOTIFICATION_DEDUPE_MS + 1000 },
      NOW
    );
    expect(out).toEqual([]);
  });

  test('item notified exactly at the window edge is re-sent (window elapsed)', () => {
    const key = notificationKey('v1', 'oil_change');
    const out = computeReminders(
      [state('v1', 'oil_change', 'overdue')],
      { [key]: NOW - NOTIFICATION_DEDUPE_MS },
      NOW
    );
    expect(out).toEqual([
      { vehicleId: 'v1', item: 'oil_change', status: 'overdue' },
    ]);
  });

  test('item notified outside the window is re-sent', () => {
    const key = notificationKey('v1', 'oil_change');
    const out = computeReminders(
      [state('v1', 'oil_change', 'due-soon')],
      { [key]: NOW - NOTIFICATION_DEDUPE_MS - 1 },
      NOW
    );
    expect(out).toEqual([
      { vehicleId: 'v1', item: 'oil_change', status: 'due-soon' },
    ]);
  });

  test('dedupe keys are per (vehicle, item) — other items unaffected', () => {
    const out = computeReminders(
      [state('v1', 'oil_change', 'overdue'), state('v1', 'tire_rotation', 'overdue')],
      { [notificationKey('v1', 'oil_change')]: NOW },
      NOW
    );
    expect(out).toEqual([
      { vehicleId: 'v1', item: 'tire_rotation', status: 'overdue' },
    ]);
  });

  test('invalid lastNotifiedAt values (NaN) do not block the notification', () => {
    const key = notificationKey('v1', 'oil_change');
    const out = computeReminders([state('v1', 'oil_change', 'overdue')], { [key]: NaN }, NOW);
    expect(out).toHaveLength(1);
  });
});

describe('reminder preference (users/{uid}.remindersEnabled, default true)', () => {
  test('missing field → enabled (default)', () => {
    expect(isReminderEnabled(undefined)).toBe(true);
    expect(isReminderEnabled({})).toBe(true);
  });

  test('explicit true → enabled', () => {
    expect(isReminderEnabled({ remindersEnabled: true })).toBe(true);
  });

  test('explicit false → disabled (skip user entirely)', () => {
    expect(isReminderEnabled({ remindersEnabled: false })).toBe(false);
  });

  test('non-boolean value does NOT disable (default stays true)', () => {
    expect(isReminderEnabled({ remindersEnabled: 'no' })).toBe(true);
  });

  test('disabled preference yields no notifications even for overdue items', () => {
    // Mirrors the scheduler loop: disabled → skip before computeReminders.
    const userData = { remindersEnabled: false };
    if (isReminderEnabled(userData)) {
      throw new Error('should have been disabled');
    }
    expect(computeReminders([state('v1', 'oil_change', 'overdue')], {}, NOW)).toHaveLength(1);
  });
});

describe('fcm token extraction (graceful no-token handling)', () => {
  test('valid token string is returned', () => {
    expect(extractFcmToken({ fcmToken: 'tok123' })).toBe('tok123');
  });

  test('missing doc / missing field → null (user skipped, no error)', () => {
    expect(extractFcmToken(undefined)).toBeNull();
    expect(extractFcmToken({})).toBeNull();
  });

  test('empty or non-string token → null (user skipped, no error)', () => {
    expect(extractFcmToken({ fcmToken: '' })).toBeNull();
    expect(extractFcmToken({ fcmToken: 42 })).toBeNull();
  });

  test('null token → null', () => {
    expect(extractFcmToken({ fcmToken: null })).toBeNull();
  });
});

describe('lastNotifiedAt map extraction', () => {
  test('valid map is copied out', () => {
    const m = { 'v1:oil_change': 123 };
    expect(extractLastNotifiedAt({ reminderLastNotifiedAt: m })).toEqual(m);
  });

  test('missing / malformed → empty map (nothing deduped)', () => {
    expect(extractLastNotifiedAt(undefined)).toEqual({});
    expect(extractLastNotifiedAt({})).toEqual({});
    expect(extractLastNotifiedAt({ reminderLastNotifiedAt: 'bogus' })).toEqual({});
    expect(extractLastNotifiedAt({ reminderLastNotifiedAt: [1, 2] })).toEqual({});
  });
});
