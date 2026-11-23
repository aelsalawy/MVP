/**
 * Export builders (T5.3, FR-5 export).
 *
 * PURE functions only — no React Native / Expo imports — so they run in a
 * plain node test environment and can be reused on any platform.
 *
 * MVP trade-off (documented): a real binary PDF generator is NOT included.
 * Instead we build a clean standalone HTML document string; the OS share
 * sheet on iOS/Android (via expo-sharing) lets the user print or
 * "Save as PDF" from the shared .html file. This avoids shipping a heavy
 * PDF dependency for the MVP. `buildSummaryHtml` produces the document.
 */

import type { ServiceEntryDoc } from '../types';

/** Entry shape accepted by the builders (HistoryEntry from history.ts works). */
export interface ExportEntry extends ServiceEntryDoc {
  id?: string;
}

/** Flattened, ordered row ready for CSV / HTML rendering. */
export interface ExportRow {
  date: string;        // ISO yyyy-mm-dd (UTC)
  odometer: number;
  serviceType: string;
  provider: string;    // '' when absent
  notes: string;       // '' when absent
  cost: string;        // money string, cents → decimal, e.g. 12345 → "123.45"
}

/** Escape one CSV field per RFC 4180: wrap in quotes when it contains a
 *  quote, comma, or (CR)LF; double embedded quotes. */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Format integer cents as plain decimal money string ("123.45"), no currency
 *  symbol (CSV-friendly; locale-independent). Negative-safe. */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Epoch ms → ISO date "yyyy-mm-dd" (UTC, stable across devices). */
export function epochToIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** Flatten entries into ordered rows (newest first — caller passes entries
 *  already sorted, but we re-sort newest-first defensively by date). */
export function buildExportRows(entries: ExportEntry[]): ExportRow[] {
  return [...entries]
    .sort((a, b) => b.date - a.date)
    .map((e) => ({
      date: epochToIsoDate(e.date),
      odometer: e.odometer,
      serviceType: e.serviceType,
      provider: e.provider ?? '',
      notes: e.notes ?? '',
      cost: centsToDecimal(e.costCents),
    }));
}

export const CSV_HEADER = ['date', 'odometer', 'serviceType', 'provider', 'notes', 'cost'];

/** Build the full CSV document (header row + data rows, \n line endings). */
export function toCsv(entries: ExportEntry[]): string {
  const rows = buildExportRows(entries);
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        escapeCsvField(r.date),
        escapeCsvField(String(r.odometer)),
        escapeCsvField(r.serviceType),
        escapeCsvField(r.provider),
        escapeCsvField(r.notes),
        escapeCsvField(r.cost),
      ].join(',')
    );
  }
  return lines.join('\n');
}

/** Minimal HTML text escaping. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a standalone printable HTML summary document for a vehicle's
 * service history. Print/save-as-PDF via the OS share sheet (see file
 * header for the MVP trade-off note).
 */
export function buildSummaryHtml(
  entries: ExportEntry[],
  opts: { vehicleLabel?: string } = {}
): string {
  const rows = buildExportRows(entries);
  const label = escapeHtml(opts.vehicleLabel ?? 'Vehicle');
  const total = rows.reduce(
    (sum, r) => sum + Math.round((Number(r.cost) || 0) * 100),
    0
  );
  const bodyRows = rows
    .map((r) => {
      const cells = [r.date, String(r.odometer), r.serviceType, r.provider, r.notes, r.cost]
        .map((c) => `<td>${escapeHtml(c)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Service History — ${label}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .meta { color: #555; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f2f2f2; }
  .total { margin-top: 16px; font-weight: bold; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>Service History — ${label}</h1>
<div class="meta">${rows.length} entries · Total spend: $${centsToDecimal(total)}</div>
<table>
<thead><tr><th>Date</th><th>Odometer</th><th>Service</th><th>Provider</th><th>Notes</th><th>Cost</th></tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
<div class="total">Total: $${centsToDecimal(total)}</div>
</body>
</html>`;
}
