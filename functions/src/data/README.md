# Maintenance Interval Seed Data (T4.1, FR-3.1)

`intervals.seed.json` contains hand-curated manufacturer maintenance
intervals for the **top-20 US models by volume** (plus a few adjacent
popular trims from the same makes), prioritized first per the MVP plan
(risk #3: license data later).

## ⚠️ Approximation notice

All `intervalMiles` / `intervalMonths` values are **reasonable
approximations** assembled from publicly-known maintenance schedules.
They are **not** licensed OEM data and must not be presented to users
as authoritative. A licensed interval dataset is a post-MVP goal;
until then, UI copy should frame due items as *estimates*.

## Schema

Each row: `{ make, model, yearFrom, yearTo, item, intervalMiles, intervalMonths }`

- `yearFrom`/`yearTo` — model-year range the row applies to (inclusive).
- `item` — snake_case schedule item key (e.g. `oil_change`,
  `tire_rotation`, `engine_air_filter`, `cabin_air_filter`,
  `brake_fluid`, `spark_plugs`, `transmission_fluid`, `engine_coolant`).
- Whichever of miles/months comes first governs due-ness (computed by
  `getNextDue` in `src/services/intervals.ts`).

Import with the callable-style `importIntervals()` in
`functions/src/intervals.ts` (idempotent upsert into the
`maintenance_intervals` Firestore collection).
