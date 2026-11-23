# QA Coverage Matrix — T8.1b Full Regression (2026-11-23)

**Repo:** car-tracker-app @ `b4c9589` (`feat(offline): firestore persistence + sync state banner (T3.4, NFR-2)`)
**Runner:** QA-Ops 🧪

## Executive results

| Gate | Result |
| --- | --- |
| Root suite (`npm run test:ci`) | ✅ 11 suites, **140 passed / 141 total** (1 todo), 0 failed |
| Functions suite (`npx jest` in functions/) | ✅ **4 suites, 63 passed / 63 total** (note: 4 suites, not 3 — reminders.test.ts added in T4.3) |
| `npx tsc --noEmit` (root) | ✅ 0 errors |
| `npx tsc --noEmit` (functions/) | ✅ 0 errors |
| `npx eslint src app --ext .ts,.tsx` | ✅ 0 errors, 3 warnings (known cosmetic, listed below) |
| `src/design/tests/` exclusion in CI | ✅ holds — `jest.config.js` `testPathIgnorePatterns` includes it; root run reports exactly 11 suites, none from `src/design/tests` |
| `firestore.rules.test.ts` exclusion | ✅ holds — listed in `testPathIgnorePatterns` (documented known issue; not part of test:ci) |

**Total: 203 passed, 0 failed (root 140 + functions 63).**

## Known lint warnings (cosmetic, pre-approved)

1. `src/design/Button.tsx:3` — `'TouchableOpacity' is defined but never used` (`@typescript-eslint/no-unused-vars`)
2. `src/design/theme.ts:38` — `'hexToRgba' is assigned a value but never used`
3. `src/services/ocr.ts:91` — `'apiKey' is assigned a value but never used`

(Additionally, Node prints a runtime deprecation notice — not an ESLint finding — about a legacy `/* eslint-env */` comment in `src/__tests__/jest.setup.ts:1` under flat config.)

## Traceability matrix

Legend: **T** = automated test, **C** = verified by code path (unit-covered logic or reviewed screen), 🔶 = thin/no direct automated coverage (see Findings).

| Req | Description (from code annotations) | Verification |
| --- | --- | --- |
| FR-1.1 | Auth + onboarding flow (T1.3) | 🔶 `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/_layout.tsx`, `src/hooks/useAuth.ts` — manual/device coverage only; no unit test exercises the auth screens. Logic is thin wrappers over firebase-auth. |
| FR-1.2 | VIN structural validation (1.2a vin-scan; 1.2b manual wizard) | **T** `src/__tests__/vinValidation.test.ts` (12 tests, "VIN structural validation (FR-1.2a)") + **C** `app/(vehicle)/vin-scan.tsx`, `app/(vehicle)/manual/index.tsx`, `src/vehicle/makes.ts`, `src/state/vehicleDraft.ts` |
| FR-1.3 | Odometer entry + validation (rollover, sanity ceiling) | **T** `src/__tests__/odometerValidation.test.ts` (14 tests) + **C** `app/(vehicle)/odometer.tsx`, `src/vehicle/odometer.ts` |
| FR-1.4 | Pinned primary action button (save UX contract) | **T** `src/__tests__/pinnedSave.test.tsx` (2 tests, "FR-1.4: pinned primary action button") + **C** `app/(vehicle)/manual/details.tsx` |
| FR-1.5 | VIN check digit / NHTSA vPIC decode (soft-fail fallback) | **T** `src/__tests__/vinValidation.test.ts` ("VIN check digit (NHTSA checksum, FR-1.5)", incl. soft-fail fallback test) + **C** `src/vin/vpic.ts`, `app/(vehicle)/decode-result.tsx` |
| FR-2.1 | Manual service entry validation + service types | **T** `src/__tests__/export.test.ts` & schedule suites exercise shared validation; **C** `src/services/entryValidation.ts` (FR-2.1 service types), `app/(vehicle)/service-entry.tsx` |
| FR-2.2 | OCR cloud parse (receipt → structured JSON) | **T** `functions/__tests__/ocr.test.ts` (10 tests, "parseReceipt (T3.2, FR-2.2)") + **C** `functions/src/ocr.ts`, `src/services/ocr.ts`, `src/state/serviceDraft.ts` |
| FR-2.3 | OCR review: editable fields ABOVE confirm | **T** indirectly via `pinnedSave`/render contracts; **C** `src/components/OcrReviewScreen.tsx` (FR-2.3 layout assertions in comments), `app/(vehicle)/ocr-review.tsx` |
| FR-2.4 | Nothing persisted until explicit Confirm | **C** `src/components/OcrReviewScreen.tsx` (Confirm/Skip handlers), `src/state/serviceDraft.ts` — logic is pure & reviewed; no dedicated unit test asserts the no-persist contract |
| FR-2.5 | Logbook: history list/detail/edit, line-item totals validation | **T** `src/__tests__/export.test.ts` (buildExportRows over history), `src/__tests__/stats.test.ts`; **C** `app/(vehicle)/history*.tsx`, `src/services/history.ts`, `src/services/entryValidation.ts` (FR-2.5 totals mismatch warning + block) |
| FR-3.1 | Manufacturer interval ingestion + due computation | **T** `functions/__tests__/intervals.test.ts` (13 tests), `src/__tests__/scheduleDue.test.ts` (11 tests, "computeNextDue (T4.1, FR-3.1)") + **C** `functions/src/intervals.ts`, `functions/src/data/intervals.seed.json`, `src/services/intervals.ts` |
| FR-3.2 | Schedule screen overdue/due-soon states | **T** `src/__tests__/scheduleEngine.test.ts` ("ok/overdue/due-soon" boundary tests) + **C** `app/(tabs)/schedule.tsx`, `src/services/scheduleEngine.ts` |
| FR-3.3 | Schedule grouping overdue → due-soon → ok | **T** `src/__tests__/scheduleEngine.test.ts` ("groups ordered overdue → due-soon → ok") + **C** `app/(tabs)/schedule.tsx` |
| FR-3.4 | Push reminder pipeline (FCM, dedupe window, per-user opt-out) | **T** `functions/__tests__/reminders.test.ts` (21 tests) + **C** `functions/src/reminders.ts` |
| FR-3.5 | Logging a service auto-completes matching schedule items | **T** `src/__tests__/scheduleEngine.test.ts` (fuzzy-match reset tests, "completes oil_change item"), `src/__tests__/scheduleDue.test.ts` (fuzzy serviceType matching) + **C** `src/state/scheduleStore.ts` |
| FR-4.2 | Factual rollup stats (totals, avg interval, 12-month series) | **T** `src/__tests__/stats.test.ts` (12 tests) + **C** `src/services/stats.ts`, `app/(vehicle)/stats.tsx` |
| FR-4 (history) | History detail view | **C** `src/services/history.ts` (FR-4 annotation), `app/(vehicle)/history-detail.tsx` |
| FR-5.x | Dashboard (vehicle header, schedule strip, recent activity) + CSV export/share | **T** `src/__tests__/export.test.ts` (26 tests: CSV escaping, cents, ordering, doc export), `src/__tests__/syncState.test.ts` (13); **C** `app/(tabs)/index.tsx` (FR-5.x header/strip/recent), `src/services/export.ts`, `src/services/exportShare.ts` |
| D3.1 | Entitlements matrix + paywall + OCR metering (fail-closed) | **T** `src/__tests__/entitlementsMatrix.test.ts` (13), `src/entitlements/hasEntitlement.test.ts` (11), `src/__tests__/paywall.test.tsx` (9), `functions/__tests__/metering.test.ts` (19) + **C** `src/entitlements/index.ts`, `src/components/Paywall.tsx`, `src/hooks/useEntitlements.ts`, `functions/src/tiers.ts` |
| NFR-1 | Cold start baseline (lazy Firebase imports, single app instance) | **C** `lib/firebase.ts` getApps() guard + per-feature imports (README §NFR-1); device benchmark pending |
| NFR-2 | Offline persistence + sync-state banner | **T** `src/__tests__/syncState.test.ts` (13 tests, "T3.4, NFR-2") + **C** `src/hooks/useSyncState.ts`, `src/components/SyncBanner.tsx` |

## Findings

1. **FR-1.1 (auth/onboarding) has no automated coverage.** Auth screens are thin wrappers; acceptable risk for MVP but should get at least a render test in a future pass.
2. **FR-2.3/FR-2.4 (edit-above-confirm, no-persist-before-confirm)** are verified by code review + component contracts but lack a dedicated unit test asserting the persistence gate. Recommend a follow-up component test.
3. **functions/ actually has 4 suites / 63 tests** (ocr, metering, intervals, reminders) — the task brief's "3 suites" is stale; reminders.test.ts was added with T4.3. All 63 pass.
4. **src/design/tests/ exclusion holds:** root jest run = 11 suites, none from `src/design/tests` (which contains an obsolete duplicate `hasEntitlement.test.ts` — kept excluded intentionally; the live copy at `src/entitlements/hasEntitlement.test.ts` runs and passes).
5. **firestore.rules.test.ts remains excluded from test:ci** (known issue, documented in jest.config.js `testPathIgnorePatterns`); it runs only via the separate rules harness and is not part of the CI gate.
6. Root suite contains **1 todo test** (skipped marker, reported as "todo", not a failure).

## Environment

- Node v24, jest + ts-jest, `npm run test:ci` = `jest --testPathIgnorePatterns 'firestore.rules.test.ts' 'src/design/tests'`
- Root: 11 suites / 141 tests (140 pass, 1 todo) in ~5.0s
- Functions: 4 suites / 63 tests in ~4.3s
