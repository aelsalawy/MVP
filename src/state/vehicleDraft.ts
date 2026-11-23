/**
 * Vehicle draft store (Car Tracker MVP — T2.1).
 *
 * Minimal in-memory draft shared across the VIN flow (and consumed by T2.2 /
 * T2.3 manual-entry + photo steps). This is a client-side zustand store only —
 * nothing is persisted to Firebase here; the vehicle doc is written later in
 * the onboarding flow once the user confirms all fields.
 */

import { create } from 'zustand';

/** Decoded VIN summary from NHTSA vPIC (T2.1) — mirror of VpicDecodeResult. */
export interface VehicleDraftDecode {
  make: string | null;
  model: string | null;
  trim: string | null;
  year: string | null;
  /** vPIC error code, if any. */
  errorCode: string | null;
}

export interface VehicleDraft {
  /** Normalized 17-char VIN, if one has been scanned/entered. */
  vin: string | null;
  /** Captured VIN photo URI (local file:// on native). */
  vinPhotoUri: string | null;
  /** Decode result from vPIC (null until a decode succeeds). */
  decode: VehicleDraftDecode | null;
  /** Manual entry fields (T2.2, FR-1.2b) — null until picked/typed by user. */
  manualMake: string | null;
  manualModel: string | null;
  manualTrim: string | null;
  manualYear: number | null;
  /** Initial odometer reading (T2.3, FR-1.3) — null until entered. */
  initialOdometer: number | null;
  /** Optional annual mileage estimate (T2.3, FR-1.3). */
  annualMileageEstimate: number | null;
  /** Whether decoded VIN checksum was valid (position 9). */
  checksumValid: boolean | null;
}

interface VehicleDraftState {
  draft: VehicleDraft;
  setVin: (vin: string | null) => void;
  setVinPhoto: (uri: string | null) => void;
  setDecode: (decode: VehicleDraftDecode | null) => void;
  setChecksumValid: (valid: boolean | null) => void;
  /** Partial manual-field update (missing fields stay unchanged). */
  setManual: (fields: Partial<Pick<VehicleDraft, 'manualMake' | 'manualModel' | 'manualTrim' | 'manualYear'>>) => void;
  /** Odometer step (T2.3): initial reading + optional annual estimate. */
  setOdometer: (initialOdometer: number | null, annualMileageEstimate?: number | null) => void;
  /** Reset the whole draft (e.g. after the vehicle is persisted). */
  reset: () => void;
}

const initialState: VehicleDraft = {
  vin: null,
  vinPhotoUri: null,
  decode: null,
  manualMake: null,
  manualModel: null,
  manualTrim: null,
  manualYear: null,
  initialOdometer: null,
  annualMileageEstimate: null,
  checksumValid: null,
};

export const useVehicleDraft = create<VehicleDraftState>((set) => ({
  draft: initialState,
  setVin: (vin) => set((s) => ({ draft: { ...s.draft, vin } })),
  setVinPhoto: (uri) => set((s) => ({ draft: { ...s.draft, vinPhotoUri: uri } })),
  setDecode: (decode) => set((s) => ({ draft: { ...s.draft, decode } })),
  setChecksumValid: (valid) => set((s) => ({ draft: { ...s.draft, checksumValid: valid } })),
  setManual: (fields) => set((s) => ({ draft: { ...s.draft, ...fields } })),
  setOdometer: (initialOdometer, annualMileageEstimate) => set((s) => ({
    draft: {
      ...s.draft,
      initialOdometer,
      annualMileageEstimate:
        annualMileageEstimate === undefined
          ? s.draft.annualMileageEstimate
          : annualMileageEstimate,
    },
  })),
  reset: () => set({ draft: initialState }),
}));
