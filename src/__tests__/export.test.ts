/** T5.3 pure unit tests: CSV escaping, money formatting, row ordering. */
import {
  toCsv,
  escapeCsvField,
  centsToDecimal,
  epochToIsoDate,
  buildExportRows,
  buildSummaryHtml,
  ExportEntry,
} from '../services/export';

const entry = (over: Partial<ExportEntry>): ExportEntry => ({
  uid: 'e1',
  ownerId: 'o1',
  vehicleId: 'v1',
  date: Date.UTC(2026, 10, 12), // Nov 12, 2026
  odometer: 52350,
  serviceType: 'maintenance',
  costCents: 12345,
  provider: 'Joe\'s Garage',
  notes: 'Oil change',
  source: 'manual',
  createdAt: Date.UTC(2026, 10, 12),
  ...over,
});

describe('escapeCsvField (RFC 4180)', () => {
  test('plain values pass through unquoted', () => {
    expect(escapeCsvField('Joes Garage')).toBe('Joes Garage');
  });

  test('comma → quoted', () => {
    expect(escapeCsvField('Joe, Inc')).toBe('"Joe, Inc"');
  });

  test('double quote → quoted + doubled', () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  test('newline → quoted', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  test('carriage return → quoted', () => {
    expect(escapeCsvField('a\rb')).toBe('"a\rb"');
  });

  test('empty string stays empty (no quotes needed)', () => {
    expect(escapeCsvField('')).toBe('');
  });
});

describe('toCsv', () => {
  test('header row present', () => {
    const csv = toCsv([]);
    expect(csv).toBe('date,odometer,serviceType,provider,notes,cost');
  });

  test('comma in provider name is escaped', () => {
    const csv = toCsv([entry({ provider: 'Acme, LLC' })]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(
      '2026-11-12,52350,maintenance,"Acme, LLC",Oil change,123.45'
    );
  });

  test('quote in provider name is doubled inside quotes', () => {
    const csv = toCsv([entry({ provider: 'Bob"s "Best" Shop' })]);
    expect(csv.split('\n')[1]).toContain('"Bob""s ""Best"" Shop"');
  });

  test('newline in notes is escaped (field quoted, structure intact)', () => {
    const csv = toCsv([entry({ notes: 'line1\nline2' })]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header, first physical line of quoted field, second
    expect(lines[1]).toBe('2026-11-12,52350,maintenance,Joe\'s Garage,"line1');
    expect(lines[2]).toBe('line2",123.45');
  });

  test('missing provider/notes become empty fields', () => {
    const csv = toCsv([entry({ provider: undefined, notes: undefined })]);
    expect(csv.split('\n')[1]).toBe('2026-11-12,52350,maintenance,,,123.45');
  });
});

describe('money formatting (centsToDecimal)', () => {
  test('12345 → "123.45"', () => expect(centsToDecimal(12345)).toBe('123.45'));
  test('0 → "0.00"', () => expect(centsToDecimal(0)).toBe('0.00'));
  test('5 → "0.05"', () => expect(centsToDecimal(5)).toBe('0.05'));
  test('100 → "1.00"', () => expect(centsToDecimal(100)).toBe('1.00'));
  test('negative → "-12.34"', () => expect(centsToDecimal(-1234)).toBe('-12.34'));
  test('rounds fractional cents', () => expect(centsToDecimal(10.4)).toBe('0.10'));
});

describe('row ordering (newest first)', () => {
  test('buildExportRows sorts newest first regardless of input order', () => {
    const rows = buildExportRows([
      entry({ date: Date.UTC(2026, 0, 1) }),
      entry({ date: Date.UTC(2026, 5, 15) }),
      entry({ date: Date.UTC(2026, 2, 3) }),
    ]);
    expect(rows.map((r) => r.date)).toEqual(['2026-06-15', '2026-03-03', '2026-01-01']);
  });

  test('toCsv preserves newest-first ordering', () => {
    const csv = toCsv([
      entry({ date: Date.UTC(2026, 0, 1), odometer: 1 }),
      entry({ date: Date.UTC(2026, 5, 15), odometer: 2 }),
    ]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('2026-06-15');
    expect(lines[2]).toContain('2026-01-01');
  });

  test('epochToIsoDate is UTC yyyy-mm-dd', () => {
    expect(epochToIsoDate(Date.UTC(2026, 10, 12))).toBe('2026-11-12');
  });
});

describe('buildSummaryHtml', () => {
  test('standalone document with escaped content and total', () => {
    const html = buildSummaryHtml([entry({ costCents: 10000, provider: '<Evil>' })], {
      vehicleLabel: 'Honda "Civic"',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('1 entries');
    expect(html).toContain('Total: $100.00');
    expect(html).toContain('&lt;Evil&gt;');
    expect(html).not.toContain('<Evil>');
    expect(html).toContain('Honda &quot;Civic&quot;');
  });
});
