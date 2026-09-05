/**
 * Truck Buddy — domain model.
 * Types mirror the system spec (ERD + mobile schemas). These are the mobile
 * app's view of the contract. The real backend implements the same shapes via
 * the API layer (see src/services/truck-buddy-api.ts).
 */

export type MembershipTier = 'basic' | 'pro' | 'union';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  membershipTier: MembershipTier;
}

export interface Vehicle {
  id: string;
  vin: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  /** Spec: assigned_driver UUID. */
  assignedDriverId: string;
}

export type StopStatus = 'pending' | 'arrived' | 'completed';

export interface Stop {
  id: string;
  routeId: string;
  sequence: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Spec: geofence radius in meters used to trigger `arrived`. */
  geofenceMeters: number;
  status: StopStatus;
  /** Canned ETA in minutes for this demo slice (real routing engine later). */
  etaMinutes: number;
  /** Distance driven from the previous stop in this demo slice. */
  legMiles: number;
  completedAt?: string;
}

export type RouteStatus = 'assigned' | 'in_progress' | 'completed';

export interface Route {
  id: string;
  driverId: string;
  date: string;
  status: RouteStatus;
  stops: Stop[];
}

export type DocumentType = 'BOL' | 'Invoice' | 'DeliveryReceipt';
export type DocumentStatus = 'pending' | 'verified' | 'error';

/** Mirrors spec `Document.parsed_fields`. */
export interface ParsedFields {
  bol_number: string;
  shipper: string;
  consignee: string;
  weight: number;
  date: string;
}

export interface TruckDocument {
  id: string;
  driverId: string;
  stopId?: string;
  type: DocumentType;
  /** In the real system this is an S3 URL. Mock data leaves it blank. */
  rawImageUrl: string | null;
  extractedText: Record<string, unknown>;
  parsedFields: ParsedFields;
  status: DocumentStatus;
  createdAt: string;
}

export type FaultCode = string;

/** Mirrors spec `VehicleDiagnostic.metrics`. */
export interface DiagnosticMetrics {
  rpm: number;
  coolant_temp: number;
  fuel_level: number;
  battery_voltage: number;
}

export interface DiagnosticSample {
  id: string;
  vehicleId: string;
  driverId: string;
  timestamp: string;
  metrics: DiagnosticMetrics;
  faultCodes: FaultCode[];
}

export type InspectionScope = 'pretrip' | 'posttrip';

export interface InspectionItem {
  id: string;
  label: string;
}

export interface InspectionEntry {
  itemId: string;
  passed: boolean;
  issueNote?: string;
  at: string;
}

/**
 * Workflow steps. `idle` is pre-shift home; after `ended` the demo can reset.
 * Scan is a transient substep of `arrived` and is tracked separately.
 */
export type WorkflowStep =
  | 'idle'
  | 'pretrip'
  | 'navigating'
  | 'arrived'
  | 'scan'
  | 'posttrip'
  | 'summary'
  | 'ended';

/** Mirrors spec `WorkflowState`. */
export interface WorkflowState {
  driverId: string;
  currentStep: WorkflowStep;
  nextStep: WorkflowStep | null;
  completedSteps: string[];
  updatedAt: string;
}

export interface TodaySession {
  driver: Driver;
  vehicle: Vehicle;
  route: Route;
  workflow: WorkflowState;
}

/* ------------------------------------------------------------------ */
/* Driver Aids — dispatch, paperwork forwarding, memory (one-handed).  */
/* ------------------------------------------------------------------ */

/** Who a driver may need to reach from the cab, one-handed. */
export type ContactRole = 'dispatch' | 'shipper' | 'consignee' | 'driver';

export interface Contact {
  id: string;
  role: ContactRole;
  /** Human-readable label — company or person's name. */
  label: string;
  phone?: string;
  /** Recipient's mobile carrier — required for live SMS (gateway routing). */
  smsCarrier?: SmsCarrierId;
  email?: string;
}

export type DispatchKind = 'sms' | 'email' | 'call';

/** Carriers with an email-to-SMS gateway the dispatch function can reach
 *  (no telecom account needed). The recipient's carrier must be on file. */
export type SmsCarrierId = 'verizon' | 'att' | 'tmobile' | 'uscellular' | 'cricket';

export const SMS_CARRIERS: readonly { id: SmsCarrierId; label: string }[] = [
  { id: 'verizon', label: 'Verizon' },
  { id: 'att', label: 'AT&T' },
  { id: 'tmobile', label: 'T-Mobile' },
  { id: 'uscellular', label: 'US Cellular' },
  { id: 'cricket', label: 'Cricket' },
];

export type DispatchStatus = 'queued' | 'sent' | 'failed';

/**
 * A single driver-initiated dispatch (auto text, auto email, auto call-back).
 * Mirrors the backend `Dispatch` resource the real API will implement.
 */
export interface Dispatch {
  id: string;
  kind: DispatchKind;
  driverId: string;
  to: Contact;
  /** Human summary shown in the activity log, e.g. "ACME Distribution — arrived". */
  subject: string;
  body?: string;
  status: DispatchStatus;
  at: string;
  /**
   * Required for kind 'sms' on the live transport: selects the
   * email-to-SMS gateway. Send fails fast without it.
   */
  carrier?: SmsCarrierId;
  /** Coarse reason bucket used by the activity log / summary. */
  category?: DispatchCategory;
}

/** A location the driver asked the app to remember (GPS memory). */
export interface RememberedStop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Radius in meters to consider "arrived" if the driver routes back here. */
  geofenceMeters: number;
  /** Freeform voice note, e.g. "back dock, gate code 4417". */
  note?: string;
  savedAt: string;
  /** Times used as a route stop — ranks "frequent stops". */
  uses: number;
}

/** Persistent driver memory: how the app auto-helps. Stored on device. */
export interface DriverPrefs {
  /** When enabled, arriving auto-notifies the stop's dispatch/shipper contact. */
  autoNotifyOnArrival: boolean;
  /**
   * When set, a captured document is auto-forwarded to this contact's email.
   * `null` means paperwork forwarding is manual only.
   */
  docForwardToContactId: string | null;
  /** Announced read-back on demand (aids drivers who can't read small print). */
  readBackOnCapture: boolean;

  /* Auto-pilot: remember decisions once so the cab flow needs almost no setup. */
  /** Master switch for safe, internal cab-flow autonomy. */
  autoMode: boolean;
  /** Remembered GPS preference (persisted — no re-toggle every stop). */
  gpsEnabled: boolean;
  /** On a successful scan, auto-forward the doc to `docForwardToContactId`. */
  forwardDocsOnAttach: boolean;
  /** On End Shift, auto-send an end-of-day report to the fleet contact. */
  sendEodReport: boolean;
  /**
   * GATED external notify: text the stop's consignee (a third-party company) on
   * arrival. Off by default; turning it on requires an explicit consent step.
   * Claims are never auto-filed externally.
   */
  notifyConsigneeOnArrival: boolean;

  /**
   * Where `sendDispatch` actually delivers.
   *  - 'mock': in-app only (default; never reaches the network).
   *  - 'live': POSTs to a Supabase Edge Function which calls Resend.
   *           Failure falls back to the mock and tags the message.
   */
  dispatchTransport: 'mock' | 'live';
  /**
   * Per-contact SMS carrier (contact id → carrier), set by the driver in
   * My Tools. Live SMS needs this to pick the email-to-SMS gateway.
   */
  smsCarriers: Record<string, SmsCarrierId>;
  /**
   * Per-contact phone overrides (contact id → digits). Demo seeds ship
   * fictional 555 numbers; the driver enters the real ones once here.
   */
  contactPhones: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Time, fatigue & detention (cab-side run tracking)                  */
/* ------------------------------------------------------------------ */

/** A logged dock-wait the driver can claim. Started automatically on arrival. */
export interface DetentionClaim {
  id: string;
  stopId: string;
  stopName: string;
  /** ISO time the driver arrived (wait started). */
  startedAt: string;
  /** ISO time they stopped waiting (stop completed). */
  endedAt: string;
  /** Whole minutes waited. */
  elapsedMinutes: number;
  /** Optional driver note (e.g. "blocked at gate 3"). */
  note?: string;
  /** True if a proof photo is attached. */
  hasProof?: boolean;
}

/** Driver's subjective energy on a 1-5 scale. */
export type FatigueLevel = 1 | 2 | 3 | 4 | 5;

export interface FatigueCheck {
  at: string;
  level: FatigueLevel;
  note?: string;
}

/**
 * Local on-duty clock. In this offline slice the whole shift counts as on-duty
 * (start -> end, minus declared breaks). A real build pairs an ELD/HOS device.
 * Persisted so it survives app restarts mid-shift.
 */
export interface DayClock {
  /** ISO of shift start (on-duty begin). */
  shiftStartedAt: string | null;
  /** ISO when the 30-minute break began (null = not on a break). */
  breakStartedAt: string | null;
  fatigueChecks: FatigueCheck[];
}

export type DispatchCategory = 'paperwork' | 'arrival' | 'repair' | 'callback';
