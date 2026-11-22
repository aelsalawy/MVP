/**
 * Security rules unit tests (T1.2 exit criteria).
 * Requires Firebase emulator: firebase emulators:exec --only firestore 'npx jest firestore.rules.test'
 */
import { readFileSync } from 'fs';
import * as firebaseTest from '@firebase/rules-unit-testing';

const projectId = 'car-tracker-rules-test';
const rules = readFileSync('firestore.rules', 'utf8');

function authed(uid: string) {
  return firebaseTest.initializeTestApp({ projectId, rules, auth: { uid } }).firestore();
}
function unauthed() {
  return firebaseTest.initializeTestApp({ projectId, rules, auth: null }).firestore();
}

afterAll(async () => {
  await Promise.all(firebaseTest.apps().map((a) => a.delete()));
});

describe('firestore security rules (T1.2)', () => {
  test('own user doc: read allowed', async () => {
    await firebaseTest.assertSucceeds(authed('u1').collection('users').doc('u1').get());
  });
  test('cross-user read denied', async () => {
    await firebaseTest.assertFails(authed('u1').collection('users').doc('u2').get());
  });
  test('cross-user write denied', async () => {
    await firebaseTest.assertFails(
      authed('u1').collection('users').doc('u2').set({ planTier: 'pro', ocrMeterCount: 0 })
    );
  });
  test('unauthenticated denied everywhere', async () => {
    await firebaseTest.assertFails(unauthed().collection('users').doc('u1').get());
    await firebaseTest.assertFails(unauthed().collection('vehicles').doc('v1').get());
  });
  test('own vehicle write allowed with matching ownerId', async () => {
    await firebaseTest.assertSucceeds(
      authed('u1').collection('vehicles').doc('v1').set({ ownerId: 'u1', make: 'Kia', model: 'Ceed', year: 2020 })
    );
  });
  test('vehicle with foreign ownerId denied (forgery guard)', async () => {
    await firebaseTest.assertFails(
      authed('u1').collection('vehicles').doc('v2').set({ ownerId: 'u2', make: 'Kia', model: 'Ceed', year: 2020 })
    );
  });
  test('account deletion: own user doc delete allowed', async () => {
    await authed('u1').collection('users').doc('u1').set({ planTier: 'free', ocrMeterCount: 0 });
    await firebaseTest.assertSucceeds(authed('u1').collection('users').doc('u1').delete());
  });
});
