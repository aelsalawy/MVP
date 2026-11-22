/**
 * NHTSA vPIC decode client (Car Tracker MVP — T2.1).
 * Free, keyless REST endpoint:
 *   GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json
 *
 * We only surface a small, curated subset of fields relevant to the MVP:
 * Make / Model / ModelYear / Trim / ErrorText / ErrorCode. Everything else is
 * ignored (vPIC returns ~140 fields; we keep the response surface minimal).
 */

export interface VpicDecodeResult {
  /** Normalized VIN used for the request. */
  vin: string;
  /** Whether vPIC returned usable data (no error + recognized vehicle). */
  success: boolean;
  make: string | null;
  model: string | null;
  trim: string | null;
  /** Model year as reported by vPIC (string; may be empty). */
  year: string | null;
  /** vPIC error code, e.g. "0" = no error. */
  errorCode: string | null;
  /** vPIC human-readable error message (often guidance text). */
  errorText: string | null;
  /** Optional count of how many of the key fields resolved to non-empty. */
  resolvedFieldCount: number;
}

interface VpicResponse {
  Results?: Record<string, string | null>[];
  Count?: number;
  Message?: string;
  SearchCriteria?: string | null;
}

const VPIC_ENDPOINT = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

/**
 * Fetch and map a vPIC decode for a VIN.
 * Never throws on network/parse errors — returns a `success: false` result so
 * the UI can render an inline error + manual fallback (AC FR-1.5).
 */
export async function decodeVin(vin: string): Promise<VpicDecodeResult> {
  const url = `${VPIC_ENDPOINT}/${encodeURIComponent(vin)}?format=json`;

  const empty = (): VpicDecodeResult => ({
    vin,
    success: false,
    make: null,
    model: null,
    trim: null,
    year: null,
    errorCode: null,
    errorText: null,
    resolvedFieldCount: 0,
  });

  let data: VpicResponse;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ...empty(), errorText: `vPIC request failed (HTTP ${res.status}).` };
    }
    data = (await res.json()) as VpicResponse;
  } catch {
    return { ...empty(), errorText: 'Unable to reach the NHTSA decode service.' };
  }

  const row = data.Results?.[0];
  if (!row) {
    return { ...empty(), errorText: 'No decode results returned for this VIN.' };
  }

  const make = row.Make?.trim() || null;
  const model = row.Model?.trim() || null;
  const trim = row.Trim?.trim() || null;
  const year = row.ModelYear?.trim() || null;
  const errorCode = row.ErrorCode ?? null;
  const errorText = row.ErrorText?.trim() || null;

  const resolvedFieldCount = [make, model, year, trim].filter(Boolean).length;

  // vPIC uses ErrorCode "0" for a clean decode; anything non-zero (or a missing
  // make/model) is treated as "no usable result" so we can route to manual.
  const hasError = errorCode !== null && errorCode !== '0';
  const recognized = make !== null && model !== null;

  return {
    vin,
    success: !hasError && recognized,
    make,
    model,
    trim,
    year,
    errorCode,
    errorText,
    resolvedFieldCount,
  };
}
