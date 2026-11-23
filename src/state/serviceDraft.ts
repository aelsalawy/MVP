/**
 * Service entry draft store (Car Tracker MVP — T3.3).
 *
 * In-memory draft shared between the OCR flow (T3.3) and the upcoming manual
 * entry form (T3.1). Same draft shape for both: the ServiceEntryDoc model from
 * src/types, plus the OCR line items. Nothing is written to Firestore here —
 * the doc is only persisted later, after the user explicitly confirms
 * (FR-2.3/FR-2.4 edit-above-confirm).
 */

import { create } from 'zustand';
import type { ServiceEntryDoc } from '../types';
import type { OcrParseResult } from '../services/ocr';

/** Line item as extracted by OCR (FR-2.2) and editable on the review screen. */
export interface ServiceLineItem {
  desc: string;
  /** Price in major currency units (e.g. dollars), not cents. */
  price: number;
}

/**
 * Service entry draft — the shared shape the manual form (T3.1) will reuse.
 * Mirrors ServiceEntryDoc but keeps money in major units and the date as a
 * display string while editing; converted on confirm.
 */
export interface ServiceEntryDraftState {
  uid: string;             // entryId (assigned by the flow that starts the draft)
  ownerId: string;
  vehicleId: string;
  odometer: number;
  date: string;            // ISO date string 'YYYY-MM-DD' while editing
  serviceType: string;
  provider: string;
  /** Total in major currency units while editing. */
  total: number;
  currency: string;
  lineItems: ServiceLineItem[];
  photoPaths: string[];
  source: 'manual' | 'ocr';
  createdAt: number;
}

/** Context the starting flow must supply (OCR parse options carry it). */
export interface ServiceDraftContext {
  uid: string;
  ownerId: string;
  vehicleId: string;
  odometer: number;
  photoPaths?: string[];
}

interface ServiceDraftStore {
  draft: ServiceEntryDraftState | null;
  /** Seed a draft from an OCR parse result (T3.3). */
  seedFromOcr: (result: OcrParseResult, ctx: ServiceDraftContext) => void;
  /** Seed an empty draft (for the T3.1 manual form). */
  seedManual: (ctx: ServiceDraftContext) => void;
  /** Partial draft update — edited fields on the review screen. */
  patch: (fields: Partial<ServiceEntryDraftState>) => void;
  updateLineItem: (index: number, item: Partial<ServiceLineItem>) => void;
  addLineItem: () => void;
  removeLineItem: (index: number) => void;
  /** Build the confirmable Firestore-doc-shaped draft. Null if no draft. */
  toServiceEntryDoc: () => ServiceEntryDoc | null;
  /** Reset (after confirm persisted elsewhere, or skip/reject). */
  reset: () => void;
}

export const useServiceDraft = create<ServiceDraftStore>((set, get) => ({
  draft: null,

  seedFromOcr: (result, ctx) =>
    set({
      draft: {
        uid: ctx.uid,
        ownerId: ctx.ownerId,
        vehicleId: ctx.vehicleId,
        odometer: ctx.odometer,
        date: result.date,
        serviceType: result.serviceType,
        provider: result.provider,
        total: result.total,
        currency: result.currency,
        lineItems: result.lineItems.map((li) => ({ ...li })),
        photoPaths: ctx.photoPaths ? [...ctx.photoPaths] : [],
        source: 'ocr',
        createdAt: Date.now(),
      },
    }),

  seedManual: (ctx) =>
    set({
      draft: {
        uid: ctx.uid,
        ownerId: ctx.ownerId,
        vehicleId: ctx.vehicleId,
        odometer: ctx.odometer,
        date: new Date().toISOString().split('T')[0],
        serviceType: '',
        provider: '',
        total: 0,
        currency: 'USD',
        lineItems: [],
        photoPaths: ctx.photoPaths ? [...ctx.photoPaths] : [],
        source: 'manual',
        createdAt: Date.now(),
      },
    }),

  patch: (fields) =>
    set((s) =>
      s.draft ? { draft: { ...s.draft, ...fields } } : s
    ),

  updateLineItem: (index, item) =>
    set((s) => {
      if (!s.draft || index < 0 || index >= s.draft.lineItems.length) return s;
      const lineItems = s.draft.lineItems.map((li, i) =>
        i === index ? { ...li, ...item } : li
      );
      return { draft: { ...s.draft, lineItems } };
    }),

  addLineItem: () =>
    set((s) =>
      s.draft
        ? { draft: { ...s.draft, lineItems: [...s.draft.lineItems, { desc: '', price: 0 }] } }
        : s
    ),

  removeLineItem: (index) =>
    set((s) => {
      if (!s.draft || index < 0 || index >= s.draft.lineItems.length) return s;
      return {
        draft: {
          ...s.draft,
          lineItems: s.draft.lineItems.filter((_, i) => i !== index),
        },
      };
    }),

  toServiceEntryDoc: () => {
    const { draft } = get();
    if (!draft) return null;
    const dateMs =
      Date.parse(`${draft.date}T00:00:00`) || draft.createdAt;
    return {
      uid: draft.uid,
      ownerId: draft.ownerId,
      vehicleId: draft.vehicleId,
      date: dateMs,
      odometer: draft.odometer,
      serviceType: draft.serviceType,
      costCents: Math.round(draft.total * 100),
      provider: draft.provider || undefined,
      notes:
        draft.lineItems.length > 0
          ? draft.lineItems
              .filter((li) => li.desc.trim())
              .map((li) => `${li.desc}: ${li.price.toFixed(2)} ${draft.currency}`)
              .join('\n')
          : undefined,
      photoPaths: draft.photoPaths.length > 0 ? [...draft.photoPaths] : undefined,
      source: draft.source,
      createdAt: draft.createdAt,
    } satisfies ServiceEntryDoc;
  },

  reset: () => set({ draft: null }),
}));
