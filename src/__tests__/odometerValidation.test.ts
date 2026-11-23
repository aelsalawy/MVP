/** T8.1a: FR-1.3 odometer + annual-estimate validation (T2.3). */
import {
  validateOdometer,
  validateAnnualEstimate,
  MAX_ODOMETER,
  JUMP_WARN_THRESHOLD,
} from '../vehicle/odometer';

describe('validateOdometer (FR-1.3: numeric, required, sanity)', () => {
  test('empty input → required error', () => {
    const r = validateOdometer('', null);
    expect(r.value).toBeNull();
    expect(r.error).toBe('Odometer is required');
    expect(r.warning).toBeNull();
  });

  test('valid initial entry, no last value', () => {
    const r = validateOdometer('52350', null);
    expect(r.value).toBe(52350);
    expect(r.error).toBeNull();
    expect(r.warning).toBeNull();
  });

  test('parses decimals to 2 places', () => {
    expect(validateOdometer('52350.75', null).value).toBe(52350.75);
  });

  test('rejects non-numeric and negative input', () => {
    expect(validateOdometer('abc', null).error).toBeTruthy();
    expect(validateOdometer('-100', null).error).toBeTruthy();
    expect(validateOdometer('52,350', null).error).toBeTruthy();
  });

  test('rejects above sanity ceiling', () => {
    const r = validateOdometer(String(MAX_ODOMETER + 1), null);
    expect(r.value).toBeNull();
    expect(r.error).toMatch(/cannot exceed/);
  });

  test('equal to ceiling is accepted', () => {
    expect(validateOdometer(String(MAX_ODOMETER), null).value).toBe(MAX_ODOMETER);
  });

  test('decreasing vs last entry → hard error (rollover protection)', () => {
    const r = validateOdometer('40000', 52350);
    expect(r.value).not.toBeNull();
    expect(r.error).toMatch(/lower than the last recorded/);
    expect(r.warning).toBeNull();
  });

  test('increase within threshold → no warning', () => {
    const r = validateOdometer('57349', 52350);
    expect(r.error).toBeNull();
    expect(r.warning).toBeNull();
  });

  test('jump > 5,000 → accepted with warning', () => {
    const r = validateOdometer('60000', 52350);
    expect(r.error).toBeNull();
    expect(r.value).toBe(60000);
    expect(r.warning).toMatch(/jump of 7,650/);
  });

  test('jump exactly at threshold → no warning (boundary)', () => {
    const r = validateOdometer(String(52350 + JUMP_WARN_THRESHOLD), 52350);
    expect(r.warning).toBeNull();
  });
});

describe('validateAnnualEstimate (FR-1.3 optional field)', () => {
  test('empty → null (optional)', () => {
    expect(validateAnnualEstimate('')).toBeNull();
    expect(validateAnnualEstimate('   ')).toBeNull();
  });

  test('valid whole number', () => {
    expect(validateAnnualEstimate('12000')).toBeNull();
  });

  test('rejects decimals and non-numeric', () => {
    expect(validateAnnualEstimate('12000.5')).toBeTruthy();
    expect(validateAnnualEstimate('12k')).toBeTruthy();
  });

  test('rejects absurd values above cap', () => {
    expect(validateAnnualEstimate('600000')).toMatch(/can't exceed/);
  });
});
