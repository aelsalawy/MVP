/**
 * Odometer entry validation (T2.3, FR-1.3).
 *
 * Pure helpers shared by the odometer screen. Sanity rules when editing
 * against the last recorded entry:
 *  - decreasing values are rejected (hard error)
 *  - a jump of more than JUMP_WARN_THRESHOLD is accepted but warned about
 */
export const MAX_ODOMETER = 10_000_000; // sanity ceiling (10M mi/km)
export const JUMP_WARN_THRESHOLD = 5_000; // FR-1.3: warn on >5k jump
export const MAX_ANNUAL_ESTIMATE = 500_000;

export interface OdometerValidation {
  /** Parsed numeric value, or null if invalid / missing. */
  value: number | null;
  /** Hard error that blocks save (e.g. decreasing vs last entry). */
  error: string | null;
  /** Non-blocking sanity warning (e.g. >5k jump). */
  warning: string | null;
}

/**
 * Validate an odometer text entry, optionally against the last recorded
 * odometer value for the vehicle (null when there is none — initial entry).
 */
export function validateOdometer(
  text: string,
  lastOdometer: number | null
): OdometerValidation {
  const trimmed = text.trim();
  if (!trimmed) {
    return { value: null, error: 'Odometer is required', warning: null };
  }
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(trimmed)) {
    return {
      value: null,
      error: 'Enter a number, e.g. 52350',
      warning: null,
    };
  }
  const value = Number(trimmed);
  if (value > MAX_ODOMETER) {
    return {
      value: null,
      error: `Odometer cannot exceed ${MAX_ODOMETER.toLocaleString()}`,
      warning: null,
    };
  }

  let error: string | null = null;
  let warning: string | null = null;

  if (lastOdometer != null) {
    if (value < lastOdometer) {
      error = `Odometer can't be lower than the last recorded value (${lastOdometer.toLocaleString()})`;
    } else if (value - lastOdometer > JUMP_WARN_THRESHOLD) {
      warning =
        `That's a jump of ${(value - lastOdometer).toLocaleString()} since the last entry — double-check the value.`;
    }
  }

  return { value, error, warning };
}

/**
 * Validate the optional annual mileage estimate. Returns null when the
 * field is empty (it is optional) or valid; otherwise an error message.
 */
export function validateAnnualEstimate(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^\d{1,6}$/.test(trimmed)) {
    return 'Enter a whole number, e.g. 12000';
  }
  if (Number(trimmed) > MAX_ANNUAL_ESTIMATE) {
    return `Annual estimate can't exceed ${MAX_ANNUAL_ESTIMATE.toLocaleString()}`;
  }
  return null;
}
