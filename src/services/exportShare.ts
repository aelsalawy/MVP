/**
 * Share-sheet integration for exports (T5.3, FR-5 export).
 *
 * RN side of src/services/export.ts (pure builders). Writes temp files via
 * expo-file-system (SDK 58 File/Paths API) and hands them to the OS share
 * sheet via expo-sharing. (expo-sharing + expo-file-system added to
 * package.json for T5.3.)
 *
 * Entitlement note (D3.1): export is gated client-side via
 * useEntitlements().has('history.export') in the History screen (cosmetic
 * enable). Server enforcement is intentionally N/A — the client exports
 * the user's own already-readable data; no privileged access is involved.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { toCsv, buildSummaryHtml, ExportEntry } from './export';

/** Write text into a temp file in the OS cache directory and return its uri. */
async function writeTempFile(fileName: string, contents: string): Promise<string> {
  const file = new File(Paths.cache, fileName);
  await file.write(contents);
  return file.uri;
}

/** Share the entries as a CSV file. */
export async function shareCsv(entries: ExportEntry[], fileName: string): Promise<void> {
  const uri = await writeTempFile(
    fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
    toCsv(entries)
  );
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export service history (CSV)',
  });
}

/**
 * Share the entries as a printable HTML document.
 * MVP trade-off: not a binary PDF — iOS/Android share sheets offer
 * print / "Save as PDF" from the shared .html file (see export.ts header).
 */
export async function shareSummary(
  entries: ExportEntry[],
  fileName: string,
  vehicleLabel?: string
): Promise<void> {
  const uri = await writeTempFile(
    fileName.endsWith('.html') ? fileName : `${fileName}.html`,
    buildSummaryHtml(entries, { vehicleLabel })
  );
  await Sharing.shareAsync(uri, {
    mimeType: 'text/html',
    dialogTitle: 'Export service history (summary)',
  });
}
