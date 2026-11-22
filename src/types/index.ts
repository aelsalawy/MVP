/**
 * Car Tracker MVP — shared Firestore document model types.
 * Single source of truth for client + Cloud Functions.
 * Spec: docs/car-tracker-mvp-spec.md (D2 Firebase, D3.1 tier-awareness).
 */

/** Subscription tiers. 'advanced' is RESERVED for future use (spec D3.1) —
 *  must remain a valid enum value; entitlements map already covers it. */
export type PlanTier = 'free' | 'advanced' | 'pro';

export interface UserDoc {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: number;
  /** D3.1: tier field from day 1. Default: 'free'. */
  planTier: PlanTier;
  /** OCR meter (T7.2): total scans; incremented via server-side FieldValue.increment. */
  ocrMeterCount: number;
}

export interface VehicleDoc {
  uid: string;          // doc id
  ownerId: string;      // users.uid
  make: string;
  model: string;
  year: number;
  trim?: string;
  vin?: string;
  initialOdometer: number;
  annualMileageEstimate?: number;
  photoPath?: string;   // storage path
  createdAt: number;
  updatedAt: number;
}

export interface ServiceEntryDoc {
  uid: string;
  ownerId: string;      // users.uid (denormalized for rules)
  vehicleId: string;    // vehicles.uid
  date: number;         // epoch ms
  odometer: number;
  serviceType: string;
  costCents: number;
  provider?: string;
  notes?: string;
  photoPaths?: string[];
  source: 'manual' | 'ocr';
  createdAt: number;
}

export interface ReminderDoc {
  uid: string;
  ownerId: string;
  vehicleId: string;
  /** Schedule item this reminder belongs to (manufacturer interval key). */
  scheduleItemKey: string;
  dueMileage?: number;
  dueTime?: number;     // epoch ms
  state: 'upcoming' | 'due_soon' | 'overdue' | 'done';
  completedAt?: number;
  completedAtOdometer?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReceiptDoc {
  uid: string;
  ownerId: string;
  vehicleId?: string;
  serviceEntryId?: string;
  storagePath: string;  // /receipts/{ownerId}/...
  ocrConfidence?: number;
  createdAt: number;
}
