/**
 * Cloud OCR parse service (FR-2.2, T3.2).
 *
 * Server-side receipt parsing using GPT-4o-mini vision via OpenAI API.
 * Reads from Firebase Storage: receipts/{uid}/{entryId}.jpg
 * Parses and writes to Firestore: users/{uid}/service_entries/{docId} (draft)
 *
 * Latency target: <10s p95, 30s hard timeout.
 *
 * Notes:
 * - OPENAI_API_KEY must be set in functions config/env (process.env.OPENAI_API_KEY)
 * - Graceful "not configured" error path (return 500 with clear message)
 * - Meter hook stub (T7.2): incrementOcrMeter(uid) — transactional increment on user doc
 * - Not gated by entitlements (per D3.1) — entitlement check happens client-side
 */

import * as admin from 'firebase-admin';
import { OpenAI } from 'openai';

// Hard timeout for OCR processing (30s as specified)
const OCR_TIMEOUT_MS = 30_000;

/**
 * Meter hook stub (T7.2) — increment ocrMeterCount transactionally on user doc.
 * Used by parseReceipt to track total OCR scans.
 *
 * @param db - Firestore instance
 * @param uid - User ID to increment meter for
 * @throws {Error} if transaction fails
 */
export async function incrementOcrMeter(db: admin.firestore.Firestore, uid: string): Promise<void> {
  if (!uid) {
    throw new Error('User ID is required for meter increment');
  }

  await db.runTransaction(async (transaction) => {
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await transaction.get(userDocRef);

    if (!userDoc.exists) {
      throw new Error(`User document does not exist: ${uid}`);
    }

    // Increment ocrMeterCount using FieldValue.increment (server-side)
    transaction.update(userDocRef, {
      ocrMeterCount: admin.firestore.FieldValue.increment(1),
    });
  });
}

/**
 * Parse receipt image using GPT-4o-mini vision.
 *
 * @param imageUrl - GCS path to receipt image (e.g. receipts/{uid}/{entryId}.jpg)
 * @param apiKey - OpenAI API key
 * @param model - OpenAI model to use (default: gpt-4o-mini)
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Parsed receipt data or null if parse fails
 * @throws {Error} if API key not configured or request fails
 */
export async function parseReceipt(
  imageUrl: string,
  apiKey: string,
  model: string = 'gpt-4o-mini',
  timeoutMs: number = OCR_TIMEOUT_MS
): Promise<ReceiptParseResult | null> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured in environment variables');
  }

  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  const client = new OpenAI({
    apiKey,
    timeout: timeoutMs,
  });

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a helpful receipt parser. Extract the following information from this receipt image and return ONLY valid JSON (no markdown, no code blocks).

Return a JSON object with this exact structure:
{
  "provider": "string",
  "date": "YYYY-MM-DD",
  "total": "number",
  "currency": "ISO 4217 currency code (e.g. USD, EUR, GBP)",
  "lineItems": [
    {
      "desc": "item description",
      "price": "number"
    }
  ],
  "serviceType": "string"
}

Rules:
- provider: extract from receipt title or merchant name
- date: extract from date line (YYYY-MM-DD format)
- total: extract total amount as number
- currency: 3-letter ISO code (e.g. "USD" for $, "EUR" for €, "GBP" for £)
- lineItems: array of {desc, price} for each line item
- serviceType: determine category (e.g. "maintenance", "fuel", "tires", "insurance", "inspection", "other")

If you cannot extract a field, omit it from the JSON object. Return null if image is not a receipt or cannot be parsed.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return null;
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Validate required fields (basic validation)
    if (!parsed.provider || !parsed.total || !parsed.currency) {
      return null;
    }

    return {
      provider: String(parsed.provider),
      date: String(parsed.date),
      total: Number(parsed.total),
      currency: String(parsed.currency).toUpperCase(),
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
      serviceType: parsed.serviceType ? String(parsed.serviceType) : 'other',
    };
  } catch (error) {
    // Log error but don't throw — let caller handle
    console.error('OCR parse failed:', error);
    return null;
  }
}

/**
 * OCR parse result (matches expected Firestore ServiceEntryDoc structure).
 */
export interface ReceiptParseResult {
  provider: string;
  date: string;
  total: number;
  currency: string;
  lineItems: Array<{ desc: string; price: number }>;
  serviceType: string;
}

/**
 * Service entry draft document (matches Firestore ServiceEntryDoc spec).
 */
export interface ServiceEntryDraft {
  uid: string;
  ownerId: string;
  vehicleId: string;
  date: number;
  odometer: number;
  serviceType: string;
  costCents: number;
  provider?: string;
  notes?: string;
  photoPaths?: string[];
  source: 'manual' | 'ocr';
  createdAt: number;
}

/**
 * Complete OCR parse and save flow.
 *
 * @param storagePath - GCS path to receipt image
 * @param db - Firestore instance
 * @param uid - User ID
 * @param entryId - New entry ID (for draft doc)
 * @param vehicleId - Vehicle ID
 * @param odometer - Current odometer reading
 * @param apiKey - OpenAI API key
 * @param model - OpenAI model to use
 * @returns Draft doc or null if parse/save failed
 * @throws {Error} if prerequisite checks fail
 */
export async function parseAndSaveReceipt(
  storagePath: string,
  db: admin.firestore.Firestore,
  uid: string,
  entryId: string,
  vehicleId: string,
  odometer: number,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<ServiceEntryDraft | null> {
  // Validate required params
  if (!storagePath || !uid || !entryId || !vehicleId || odometer === undefined) {
    throw new Error('Missing required parameters for parseAndSaveReceipt');
  }

  // Step 1: Parse receipt using GPT-4o-mini
  const parsed = await parseReceipt(
    `gs://${storagePath}`,
    apiKey,
    model
  );

  if (!parsed) {
    return null;
  }

  // Step 2: Create service entry draft
  const draftDoc: ServiceEntryDraft = {
    uid: entryId, // Entry ID becomes document ID
    ownerId: uid,
    vehicleId,
    date: new Date(parsed.date).getTime(),
    odometer,
    serviceType: parsed.serviceType,
    costCents: Math.round(parsed.total * 100),
    provider: parsed.provider,
    notes: parsed.lineItems.length > 0
      ? `Line items: ${parsed.lineItems.map(li => `${li.desc}: ${li.price}`).join(', ')}`
      : undefined,
    photoPaths: [storagePath],
    source: 'ocr',
    createdAt: Date.now(),
  };

  // Step 3: Save to Firestore
  try {
    await db.collection('users').doc(uid).collection('service_entries').doc(entryId).set(draftDoc);
  } catch (error) {
    console.error('Failed to save service entry draft:', error);
    return null;
  }

  // Step 4: Increment OCR meter (stub for T7.2)
  try {
    await incrementOcrMeter(db, uid);
  } catch (error) {
    console.error('Failed to increment OCR meter:', error);
    // Don't fail the main flow if meter increment fails
  }

  return draftDoc;
}
