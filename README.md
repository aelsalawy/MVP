# Car Tracker MVP

React Native (Expo) mobile app for tracking vehicles. This repository contains the
foundation scaffold: Expo + TypeScript + expo-router + Firebase (Auth / Firestore /
Storage / Cloud Functions / FCM), with CI and an EAS build pipeline configured.

## Stack

| Layer      | Choice                                      |
| ---------- | ------------------------------------------- |
| Framework  | Expo SDK 58 (React Native 0.88)             |
| Language   | TypeScript (strict)                         |
| Routing    | expo-router (typed routes)                  |
| Backend    | Firebase — Auth, Firestore, Storage          |
| Functions  | Firebase Cloud Functions (server-side)       |
| Push       | Firebase Cloud Messaging (FCM)               |
| CI         | GitHub Actions (typecheck + lint)            |
| Builds     | EAS Build + Submit (TestFlight / Play internal) |

## Prerequisites

- Node.js 20+ (project developed against Node 24)
- npm 10+
- Expo CLI (`npx expo`), an [Expo account](https://expo.dev), and the
  [EAS CLI](https://docs.expo.dev/eas/) (`npm i -g eas-cli`) for builds.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in EXPO_PUBLIC_FIREBASE_* values
```

The Firebase client config is injected at build time from `EXPO_PUBLIC_*`
environment variables (see `lib/firebase.ts` and `.env.example`). These are the
public web config keys only — server secrets live in Cloud Functions, never here.

## Run

```bash
npm start          # Expo dev server (Metro)
npm run android    # launch on Android (Expo Go or dev client)
npm run ios        # launch on iOS (macOS + simulator)
npm run web        # launch in a web browser
```

## Quality gates

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run ci         # typecheck + lint (same as CI)
```

These run automatically in CI on every push and PR (`.github/workflows/ci.yml`).

## Building & releasing (EAS)

`eas.json` defines three build profiles:

- **development** — debug/dev-client build, `distribution: internal`, Android APK,
  iOS simulator build. For local iteration with a development client.
- **preview** — internal distribution, Android APK, iOS device build (no simulator).
  For sharing test builds with the team.
- **production** — Android app-bundle on the `internal` track, iOS Release build
  submitted to TestFlight (`submit` config uses `APPLE_ID` / `ASC_APP_ID` /
  `APPLE_TEAM_ID` env vars).

Commands:

```bash
eas build --profile development
eas build --profile preview
eas build --profile production
eas submit --profile production   # iOS TestFlight / Android internal track
```

> Actual cloud builds are not part of this ticket's deliverable — the committed
> `eas.json` profiles define the pipeline. You must run `eas build:configure`
> and set the EAS project id before triggering real builds.

## Non-functional requirements — baseline

- **NFR-1 (cold start < 3s):** config choices made to keep startup fast —
  - Single Firebase app instance via `getApps()` guard (HMR / Fast Refresh safe,
    no duplicate init).
  - Firebase SDK modules imported lazily by feature (`firebase/auth`, `firebase/firestore`,
    `firebase/storage`) rather than the monolithic `firebase` barrel.
  - `newArchEnabled: true` (New Architecture / Fabric + TurboModules) for better
    runtime performance.
  - Minimal `app/` route tree (root layout + index screen) — no heavy eager imports
    at launch.
  - These are baseline choices only; a measured cold-start benchmark still needs a
    physical device/CI device-lab run.

## Project structure

```
app/                 # expo-router route tree
  _layout.tsx        # root Stack layout + StatusBar
  index.tsx          # home screen
lib/
  firebase.ts        # Firebase init + Auth/Firestore/Storage exports
eas.json             # EAS build & submit profiles
.github/workflows/ci.yml
```

## Commit convention

Conventional Commits — `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`.
