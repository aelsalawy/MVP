/**
 * VIN validation helpers (Car Tracker MVP — T2.1).
 * NHTSA / ISO 3779 standard 17-character VIN.
 *
 * Rules enforced here:
 *  - Must be exactly 17 characters.
 *  - Only A–Z (uppercase) and 0–9; the letters I, O, Q are illegal in VINs.
 *  - Standard North-American check digit (position 9) is validated using the
 *    NHTSA transliteration table + weight factors.
 *
 * NOTE: the check digit (position 9) is informational in many regions. We
 * surface a soft "checksum" result rather than hard-rejecting, because some
 * valid foreign VINs do not encode a US check digit. The caller decides how
 * to treat it (see decode-result screen "match quality").
 */

const ILLEGAL_CHARS = /[IOQ]/;

/** Letters I, O, Q are never valid in a VIN. */
export function containsIllegalChars(vin: string): boolean {
  return ILLEGAL_CHARS.test(vin);
}

/** Length must be exactly 17 and only alphanumeric. */
export function hasValidLength(vin: string): boolean {
  return /^[A-Z0-9]{17}$/.test(vin);
}

/**
 * NHTSA transliteration table (position → weight) and value map.
 * Position 9 is the check digit itself and is skipped during calculation.
 */
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

function transliterate(char: string): number {
  if (/[0-9]/.test(char)) return Number(char);
  return TRANSLITERATION[char] ?? 0;
}

/**
 * Compute the expected check digit for a VIN.
 * Returns the expected 0–9 or 'X' (10), or null if the VIN is malformed.
 */
export function computeCheckDigit(vin: string): string | null {
  if (!hasValidLength(vin)) return null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const weight = WEIGHTS[i];
    const value = transliterate(vin[i]);
    sum += weight * value;
  }
  const remainder = sum % 11;
  return remainder === 10 ? 'X' : String(remainder);
}

export interface VinValidationResult {
  /** Normalized uppercase VIN (or trimmed input if invalid). */
  normalized: string;
  valid: boolean;
  /** True when length === 17 and all chars legal. */
  structurallyValid: boolean;
  /** True when the check digit (position 9) matches the NHTSA calculation. */
  checksumValid: boolean;
  /** Human-readable reason when invalid, otherwise null. */
  error: string | null;
}

/**
 * Normalize and validate a VIN. Never throws — always returns a result object
 * so the UI can render inline errors.
 */
export function validateVin(raw: string): VinValidationResult {
  const normalized = raw.toUpperCase().replace(/\s+/g, '').trim();

  if (normalized.length === 0) {
    return {
      normalized,
      valid: false,
      structurallyValid: false,
      checksumValid: false,
      error: 'Enter a VIN to continue.',
    };
  }

  if (containsIllegalChars(normalized)) {
    return {
      normalized,
      valid: false,
      structurallyValid: false,
      checksumValid: false,
      error: "VINs never contain the letters I, O, or Q.",
    };
  }

  if (!hasValidLength(normalized)) {
    return {
      normalized,
      valid: false,
      structurallyValid: false,
      checksumValid: false,
      error: `VIN must be 17 characters (currently ${normalized.length}).`,
    };
  }

  const expected = computeCheckDigit(normalized);
  const checksumValid = expected === normalized[8];

  return {
    normalized,
    valid: true,
    structurallyValid: true,
    checksumValid,
    error: null,
  };
}
