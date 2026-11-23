/**
 * Client-side OCR wrapper (FR-2.2, T3.2).
 *
 * Thin wrapper that calls the Cloud OCR parse service endpoint.
 * Per D3.1: client-side entitlement check required before calling this service.
 *
 * This file is a stub phase implementation (T3.2) — actual Cloud Function
 * endpoint not yet deployed.
 *
 * Note: parseReceipt is re-exported from functions/src/ocr.ts for testing.
 */

import { ServiceEntryDoc } from '../types';

/** Client-side OCR parse result (matches server-side structure). */
export interface ReceiptParseResult {
  provider: string;
  date: string;
  total: number;
  currency: string;
  lineItems: { desc: string; price: number }[];
  serviceType: string;
}

/** Service entry draft for OCR (matches ServiceEntryDoc spec). */
export interface ServiceEntryDraft extends ServiceEntryDoc {
  uid: string; // Will be set from entryId
  lineItems: { desc: string; price: number }[]; // Override to use T[]
  // Override uid to be required
}

/**
 * Options for OCR parsing.
 */
export interface OcrParseOptions {
  /**
   * Firebase Storage path to receipt image.
   * Format: receipts/{uid}/{entryId}.jpg
   */
  storagePath: string;

  /**
   * User ID (for meter increment).
   */
  uid: string;

  /**
   * Entry ID (for draft doc).
   */
  entryId: string;

  /**
   * Vehicle ID.
   */
  vehicleId: string;

  /**
   * Current odometer reading.
   */
  odometer: number;

  /**
   * OpenAI API key (for development/testing only).
   * In production, this should be obtained from backend.
   */
  apiKey?: string;
}

/**
 * Client-side OCR parse result (matches server-side ReceiptParseResult).
 */
export interface OcrParseResult {
  provider: string;
  date: string;
  total: number;
  currency: string;
  lineItems: { desc: string; price: number }[];
  serviceType: string;
}

/**
 * Mock implementation for development/testing.
 *
 * In stub phase, this bypasses actual API calls and returns sample data.
 * Will be replaced with real API call in later task phases.
 *
 * @param options - OCR parse options
 * @returns Sample parse result or null
 */
export async function parseReceiptMock(options: OcrParseOptions): Promise<OcrParseResult | null> {
  const { storagePath, uid, entryId, vehicleId, odometer, apiKey } = options;

  // Validate required params
  if (!storagePath || !uid || !entryId || !vehicleId || odometer === undefined) {
    console.error('Missing required parameters for OCR parse');
    return null;
  }

  // Validate storage path format
  if (!storagePath.startsWith('receipts/')) {
    console.error('Invalid storage path format. Expected: receipts/{uid}/{entryId}.jpg');
    return null;
  }

  // TODO(T3.3): Replace with actual Cloud Function API call
  // Example endpoint: POST /api/ocr/parse
  // const response = await fetch('/api/ocr/parse', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ storagePath, uid, entryId, vehicleId, odometer }),
  // });
  // if (!response.ok) throw new Error('OCR parse failed');
  // return response.json();

  // Stub implementation: return sample data
  console.log('🧪 OCR parse called (stub phase):', {
    storagePath,
    uid,
    entryId,
    vehicleId,
    odometer,
  });

  return {
    provider: 'Sample Merchant',
    date: new Date().toISOString().split('T')[0],
    total: 150.00,
    currency: 'USD',
    lineItems: [
      { desc: 'Sample Item 1', price: 50.00 },
      { desc: 'Sample Item 2', price: 100.00 },
    ],
    serviceType: 'other',
  };
}

/**
 * Create service entry draft from OCR result (client-side helper).
 *
 * @param parseResult - OCR parse result
 * @returns Service entry draft document
 */
export function createServiceEntryDraftFromOcr(
  parseResult: OcrParseResult
): ServiceEntryDraft {
  return {
    uid: 'pending', // TODO: Use actual entryId
    ownerId: 'pending', // TODO: Use actual uid
    vehicleId: 'pending', // TODO: Use actual vehicleId
    date: new Date(parseResult.date).getTime(),
    odometer: 0, // TODO: Use actual odometer
    serviceType: parseResult.serviceType,
    costCents: Math.round(parseResult.total * 100),
    provider: parseResult.provider,
    notes: parseResult.lineItems.length > 0
      ? `Line items: ${parseResult.lineItems.map(li => `${li.desc}: ${li.price}`).join(', ')}`
      : undefined,
    lineItems: parseResult.lineItems,
    photoPaths: [],
    source: 'ocr',
    createdAt: Date.now(),
  };
}

/**
 * Parse receipt and create service entry draft.
 *
 * This is the main client-side entry point. It validates input,
 * calls the OCR service (stub phase), and creates a draft document.
 *
 * Per D3.1: entitlement check should be performed by caller before calling this.
 *
 * @param options - OCR parse options
 * @returns Service entry draft or null if parse failed
 */
export async function parseAndCreateDraft(
  options: OcrParseOptions
): Promise<ServiceEntryDraft | null> {
  const { apiKey } = options;

  // Validate API key in development
  if (apiKey && process.env.NODE_ENV !== 'production') {
    console.warn(
      '⚠️  WARNING: Using API key in client-side code (dev only). ' +
        'In production, this should be obtained from backend auth.'
    );
  }

  // Call OCR service (stub phase)
  const parseResult = await parseReceiptMock(options);

  if (!parseResult) {
    console.error('OCR parse failed');
    return null;
  }

  // Create service entry draft
  return createServiceEntryDraftFromOcr(parseResult);
}

/**
 * Check if OCR service is available.
 *
 * @returns true if OCR service is configured/available
 */
export function isOcrServiceAvailable(): boolean {
  // In stub phase, always return true
  // TODO(T3.3): Check if backend endpoint is deployed
  return true;
}

/**
 * Get OCR service configuration.
 *
 * @returns Service configuration or null if not available
 */
export function getOcrConfig(): { provider: string; model: string } | null {
  // In stub phase, return sample config
  return {
    provider: 'GPT-4o-mini',
    model: 'gpt-4o-mini',
  };
}
