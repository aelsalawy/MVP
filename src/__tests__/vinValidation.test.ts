/** T8.1a: FR-1.2a/1.5 VIN checksum validation (NHTSA check digit, ISO 3779). */
import {
  validateVin,
  computeCheckDigit,
  hasValidLength,
  containsIllegalChars,
} from '../vin/validation';

// Known-good VINs (valid NHTSA check digit at position 9).
const VALID_VINS = [
  '1HGCM82633A004352', // classic Honda Accord example (check digit 3)
  'JH4KA7561PC008269', // Acura (check digit 1)
  '2T1HK38E57C664647', // Toyota Camry (computed check digit 5)
];

// Same VINs with position 9 corrupted → checksum must fail.
const BAD_CHECKSUM_VINS = ['1HGCM82643A004352', 'JH4KA7562PC008269'];

describe('VIN structural validation (FR-1.2a)', () => {
  test('accepts 17-char alphanumeric uppercase VIN', () => {
    for (const vin of VALID_VINS) {
      const r = validateVin(vin);
      expect(r.valid).toBe(true);
      expect(r.structurallyValid).toBe(true);
      expect(r.error).toBeNull();
    }
  });

  test('normalizes lowercase + whitespace input', () => {
    const r = validateVin('  1hgc m82633a004352 ');
    expect(r.normalized).toBe('1HGCM82633A004352');
    expect(r.valid).toBe(true);
  });

  test.each(['', '   '])('empty input %j → required error, no throw', (raw) => {
    const r = validateVin(raw);
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Enter a VIN to continue.');
  });

  test('rejects illegal letters I, O, Q anywhere', () => {
    for (const vin of ['1HGCM82633A00435I', 'O1GCM82633A004352', '1HGCM82633A0043Q2'.slice(0, 17)]) {
      expect(containsIllegalChars(vin)).toBe(true);
    }
    const r = validateVin('1HGCM82633A00435I');
    expect(r.valid).toBe(false);
    expect(r.structurallyValid).toBe(false);
    expect(r.error).toMatch(/I, O, or Q/i);
  });

  test('rejects wrong length (16 and 18 chars)', () => {
    expect(hasValidLength('1HGCM82633A00435')).toBe(false);
    expect(hasValidLength('1HGCM82633A0043521')).toBe(false);
    const r = validateVin('1HGCM82633A00435');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/17 characters/);
  });

  test('rejects non-alphanumeric characters', () => {
    expect(hasValidLength('1HGCM82633A00435!')).toBe(false);
    const r = validateVin('1HGCM82633A00-352');
    expect(r.valid).toBe(false);
  });
});

describe('VIN check digit (NHTSA checksum, FR-1.5)', () => {
  test('known valid VINs pass checksum', () => {
    for (const vin of VALID_VINS) {
      expect(validateVin(vin).checksumValid).toBe(true);
    }
  });

  test('check digit X (value 10) handled by computeCheckDigit', () => {
    // 1HGCM826300000008 computes check digit X (verified against NHTSA table).
    const vinX = '1HGCM826300000008';
    // pos9 placeholder replaced with X → full valid VIN
        const vin = '1HGCM826' + 'X' + '00000008';
    expect(computeCheckDigit(vin)).toBe('X');
    const r = validateVin(vin);
    expect(r.valid).toBe(true);
    expect(r.checksumValid).toBe(true);
  });

  test('corrupted position-9 fails checksum but stays structurally valid (soft fail → FR-1.5 fallback path)', () => {
    for (const vin of BAD_CHECKSUM_VINS) {
      const r = validateVin(vin);
      expect(r.valid).toBe(true); // soft checksum, caller decides
      expect(r.structurallyValid).toBe(true);
      expect(r.checksumValid).toBe(false);
    }
  });

  test('computeCheckDigit returns null for malformed VIN', () => {
    expect(computeCheckDigit('SHORT')).toBeNull();
  });

  test('checksum validation never throws on any result object', () => {
    expect(() => validateVin('!!!')).not.toThrow();
    expect(() => validateVin('JH4KA7561PC008269')).not.toThrow();
  });
});
