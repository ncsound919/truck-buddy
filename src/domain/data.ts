import type {
  Contact,
  DayClock,
  DiagnosticSample,
  DocumentType,
  DriverPrefs,
  DvirReport,
  HosStatus,
  HosViolation,
  InspectionEntry,
  InspectionItem,
  InspectionScope,
  ParsedFields,
  RememberedStop,
  Route,
  Stop,
  TodaySession,
  TruckDocument,
  Vehicle,
} from '@/domain/types';

/** Short random suffix for locally-created records (remembered stops, dispatches). */
export function uid(): string {
  // Always 8 chars so the id can't collapse to "" (Math.random()===0) and
  // collide as a dedup key in CAPTURE_DONE.
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

/**
 * Deterministic demo fixtures. Replaces what will later come from the backend.
 * Everything here is static so the app is fully runnable offline against the
 * MockApi — no network, no hardware.
 */

export const DEMO_DRIVER_ID = 'driver_terrence';
export const DEMO_VEHICLE_ID = 'vehicle_cascadia_224';
export const DEMO_ROUTE_ID = 'route_2026_09_04';

const _now = new Date();
export const TODAY = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

const VIN = '3AKJHHDR8LSLA9381';
const plate = 'NC-7A2K19';

export const DEMO_VEHICLE: Vehicle = {
  id: DEMO_VEHICLE_ID,
  vin: VIN,
  plate,
  make: 'Freightliner',
  model: 'Cascadia',
  year: 2023,
  assignedDriverId: DEMO_DRIVER_ID,
};

/**
 * Fallback canned OCR result. Mirrors the "Bill of Lading" the wireframe
 * references. The real OCR microservice returns these same ParsedFields.
 */
export const DEMO_BOL_FIELDS: ParsedFields = {
  bol_number: 'BOL-882114',
  shipper: 'Raleigh Freight Co.',
  consignee: 'ACME Distribution Center',
  weight: 18750,
  date: TODAY,
};

export const DEMO_INSPECTION_ITEMS: InspectionItem[] = [
  { id: 'tires', label: 'Tires' },
  { id: 'brakes', label: 'Brakes' },
  { id: 'lights', label: 'Lights' },
  { id: 'fluids', label: 'Fluids' },
  { id: 'coupling', label: 'Coupling' },
];

/** One canned OBD snapshot. Real OBD ingestion + live feed arrive later. */
export const DEMO_OBD_SAMPLE: DiagnosticSample = {
  id: 'diag_1',
  vehicleId: DEMO_VEHICLE_ID,
  driverId: DEMO_DRIVER_ID,
  timestamp: new Date().toISOString(),
  metrics: {
    rpm: 1420,
    coolant_temp: 192,
    fuel_level: 76,
    battery_voltage: 13.8,
  },
  faultCodes: [],
};

export function makeDemoRoute(): Route {
  return {
    id: DEMO_ROUTE_ID,
    driverId: DEMO_DRIVER_ID,
    date: TODAY,
    status: 'assigned',
    stops: [
      {
        id: 'stop_acme',
        routeId: DEMO_ROUTE_ID,
        sequence: 1,
        name: 'ACME Distribution Center',
        address: '2100 Tradeport Dr, Charlotte, NC',
        lat: 35.214,
        lng: -80.943,
        geofenceMeters: 300,
        status: 'pending',
        etaMinutes: 32,
        legMiles: 112,
        destinations: [
          { id: 'acme_b', kind: 'building', label: 'Building B', detail: 'Receiving office, door 14', handlingMinutes: 18 },
          { id: 'acme_dock3', kind: 'dock', label: 'Dock 3', detail: 'Tall gate — 53ft ok', handlingMinutes: 14 },
          { id: 'acme_dock4', kind: 'dock', label: 'Dock 4', detail: 'Inside refrigerated', handlingMinutes: 10 },
        ],
      },
      {
        id: 'stop_haley',
        routeId: DEMO_ROUTE_ID,
        sequence: 2,
        name: 'Haley Logistics Yard',
        address: '501 Fairgrounds Rd, Greensboro, NC',
        lat: 36.0726,
        lng: -79.792,
        geofenceMeters: 250,
        status: 'pending',
        etaMinutes: 18,
        legMiles: 60,
        destinations: [
          { id: 'haley_gate', kind: 'unit', label: 'Gate house', detail: 'Check-in, yard office', handlingMinutes: 6 },
          { id: 'haley_dock2', kind: 'dock', label: 'Dock 2', detail: 'East wall', handlingMinutes: 12 },
        ],
      },
      {
        id: 'stop_carolina',
        routeId: DEMO_ROUTE_ID,
        sequence: 3,
        name: 'Carolina Cold Storage',
        address: '88 Refrigerated Row, Burlington, NC',
        lat: 36.0957,
        lng: -79.4378,
        geofenceMeters: 400,
        status: 'pending',
        etaMinutes: 24,
        legMiles: 146,
        destinations: [
          { id: 'car_house12', kind: 'house', label: 'House 12', detail: 'Rear lane, ring bell', handlingMinutes: 8 },
          { id: 'car_house14', kind: 'house', label: 'House 14', detail: 'Side entrance', handlingMinutes: 8 },
          { id: 'car_bay', kind: 'building', label: 'Bay 1', detail: 'Cold ramp — gloves', handlingMinutes: 16 },
        ],
      },
    ],
  };
}

/** On-site delivery time for a stop: sum of every destination's handling time. */
export function stopOnSiteMinutes(stop: Pick<Stop, 'destinations'>): number {
  return (stop.destinations ?? []).reduce((total, d) => total + (d.handlingMinutes ?? 0), 0);
}

/** Builds a complete, consistent demo session. */
export async function buildDemoSession(): Promise<TodaySession> {
  await delay(120); // simulate network latency — keeps async seams honest
  const route = makeDemoRoute();
  return {
    driver: {
      id: DEMO_DRIVER_ID,
      name: 'Terrence',
      phone: '+1 (919) 555-0134',
      email: 'terrence@truckbuddy.online',
      membershipTier: 'pro',
    },
    vehicle: DEMO_VEHICLE,
    route,
    workflow: {
      driverId: DEMO_DRIVER_ID,
      currentStep: 'idle',
      nextStep: 'pretrip',
      completedSteps: [],
      updatedAt: new Date().toISOString(),
    },
  };
}

export function makeMockDocument(
  stopId: string | undefined,
  type: DocumentType,
  fields: ParsedFields,
): TruckDocument {
  return {
    id: `doc_${Math.random().toString(36).slice(2, 10)}`,
    driverId: DEMO_DRIVER_ID,
    stopId,
    type,
    rawImageUrl: null, // real upload path — see services/truck-buddy-api.ts
    extractedText: {
      raw: `${fields.bol_number}\nSHIPPER: ${fields.shipper}\nCONSIGNEE: ${fields.consignee}\nWEIGHT: ${fields.weight} LBS`,
    },
    parsedFields: fields,
    status: 'verified',
    createdAt: new Date().toISOString(),
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Driver-aid fixtures: contacts, memory seeds, prefs, message builders */
/* ------------------------------------------------------------------ */

/** Fleet + dispatch seed records. The API seam merges these with the
 *  device address book (expo-contacts) at runtime — see getContacts. */
export const DEMO_CONTACTS: Contact[] = [
  { id: 'c_dispatch', role: 'dispatch', label: 'Dispatch · HQ', phone: '+1 (800) 555-0199', email: 'dispatch@truckbuddy.online' },
  { id: 'c_acme', role: 'consignee', label: 'ACME Distribution', phone: '+1 (704) 555-0142', email: 'dock@acmefreight.example' },
  { id: 'c_haley', role: 'consignee', label: 'Haley Logistics', phone: '+1 (336) 555-0188', email: 'receiving@haleylogistics.example' },
  { id: 'c_carolina', role: 'consignee', label: 'Carolina Cold Storage', phone: '+1 (336) 555-0177', email: 'gate@carolinacold.example' },
];

/** Auto-pilot defaults. External (notify) stays OFF; safe internal chain is ON. */
export const DEFAULT_PREFS: DriverPrefs = {
  autoNotifyOnArrival: false,
  docForwardToContactId: 'c_dispatch',
  readBackOnCapture: true,
  autoMode: true,
  gpsEnabled: true,
  forwardDocsOnAttach: true,
  sendEodReport: true,
  notifyConsigneeOnArrival: false,
  dispatchTransport: 'mock',
  smsCarriers: {},
  contactPhones: {},
};

/** Backfills prefs stored before a field existed (cheap migration). */
export function normalizePrefs(prefs: Partial<DriverPrefs> | null): DriverPrefs {
  const merged = { ...DEFAULT_PREFS, ...(prefs ?? {}) };
  // Sanitize the map fields — a stored `null` would throw on index access.
  return {
    ...merged,
    smsCarriers:
      merged.smsCarriers && typeof merged.smsCarriers === 'object' ? merged.smsCarriers : {},
    contactPhones:
      merged.contactPhones && typeof merged.contactPhones === 'object'
        ? merged.contactPhones
        : {},
  };
}

/** Pre-seeded GPS memory so the feature is visible before the driver saves one. */
export const DEMO_REMEMBERED_STOPS: RememberedStop[] = [
  {
    id: 'mem_dispatch_yard',
    name: 'Dispatch Yard (Home)',
    address: '4500 Terminal Ave, Raleigh, NC',
    lat: 35.8568,
    lng: -78.6351,
    geofenceMeters: 200,
    note: 'Gates open 04:00',
    savedAt: new Date(Date.now() - 6 * 864e5).toISOString(),
    uses: 12,
  },
];

export interface DispatchTemplates {
  arrivedSms: (stopName: string) => string;
  completedSms: (stopName: string) => string;
  docEmailSubject: (docNumber: string, type: string) => string;
  docEmailBody: (docNumber: string, stopName: string, shipper: string, weight: number) => string;
  repairTicketSubject: (truck: string, itemLabel: string) => string;
  repairTicketBody: (truck: string, itemLabel: string, note: string) => string;
  /** External consignee arrival text — includes identity so it's not impersonation. */
  consigneeArrivalSms: (stopName: string, unit: string, driverName: string) => string;
}

/** HOS reference values used for the cab-side day clock (real ELD pairing later). */
export const HOS_RULES = {
  onDutyHours: 14,
  driveHours: 11,
  breakMinutes: 30,
  /** FMCSA 395.3(a)(3)(ii): a 30-min break is required after 8h of driving/on-duty. */
  breakAfterMinutes: 8 * 60,
  // Demo only: how long a fatigued driver must rest. Not an FMCSA rule.
  fatigueRestMinutes: 30,
} as const;

/** Backfills a stored clock that predates drive-tracking (cheap migration). */
export function normalizeClock(clock: Partial<DayClock> | null): DayClock {
  const fatigue = clock?.fatigueChecks;
  return {
    shiftStartedAt: clock?.shiftStartedAt ?? null,
    breakStartedAt: clock?.breakStartedAt ?? null,
    driveStartedAt: clock?.driveStartedAt ?? null,
    driveMinutes: clock?.driveMinutes ?? 0,
    lastBreakEndedAt: clock?.lastBreakEndedAt ?? null,
    // A corrupted non-array would throw when spread by LOG_FATIGUE.
    fatigueChecks: Array.isArray(fatigue) ? fatigue : [],
  };
}

/** Formats whole minutes as "7h 12m" (or "12m" when under an hour). */
export function minutesToClock(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${String(rem).padStart(2, '0')}m` : `${rem}m`;
}

/**
 * Live hours-of-service snapshot. Pure — no side effects — so the run bar,
 * compliance dashboard, and summary screens all read the same numbers.
 */
export function computeHosStatus(clock: DayClock, now: number): HosStatus {
  const driveLimitMinutes = HOS_RULES.driveHours * 60;
  const onDutyLimitMinutes = HOS_RULES.onDutyHours * 60;

  const liveDrive = clock.driveStartedAt
    ? Math.max(0, Math.floor((now - new Date(clock.driveStartedAt).getTime()) / 60000))
    : 0;
  const driveMinutes = clock.driveMinutes + liveDrive;

  let onDutyMinutes = 0;
  if (clock.shiftStartedAt) {
    const start = new Date(clock.shiftStartedAt).getTime();
    const end = clock.breakStartedAt
      ? Math.min(now, new Date(clock.breakStartedAt).getTime())
      : now;
    onDutyMinutes = Math.max(0, Math.floor((end - start) / 60000));
  }

  const onBreak = !!clock.breakStartedAt;
  const breakRemainingMinutes = onBreak
    ? Math.max(0, Math.ceil((HOS_RULES.breakMinutes * 60000 - (now - new Date(clock.breakStartedAt as string).getTime())) / 60000))
    : 0;

  // 30-min break required once 8h have passed since the last break (or shift start).
  const sinceBreakStart = clock.lastBreakEndedAt ?? clock.shiftStartedAt;
  const sinceBreakMs = sinceBreakStart ? now - new Date(sinceBreakStart).getTime() : 0;
  const breakRequired = !onBreak && sinceBreakMs >= HOS_RULES.breakAfterMinutes * 60000 && driveMinutes > 0;

  const driveRemaining = driveLimitMinutes - driveMinutes;
  const onDutyRemaining = onDutyLimitMinutes - onDutyMinutes;

  let violation: HosViolation = 'none';
  if (driveRemaining <= 0) violation = 'drive';
  else if (onDutyRemaining <= 0) violation = 'onduty';
  else if (breakRequired) violation = 'break';
  else if (driveRemaining <= 60 || onDutyRemaining <= 60) violation = 'warning';

  const messages: string[] = [];
  if (violation === 'drive') messages.push(`11-hour drive limit reached — stop driving.`);
  else if (driveRemaining <= 60) messages.push(`${minutesToClock(driveRemaining)} of drive time left.`);
  if (violation === 'onduty') messages.push(`14-hour on-duty window over — end shift or go off duty.`);
  else if (onDutyRemaining <= 60) messages.push(`${minutesToClock(onDutyRemaining)} left in your 14-hour window.`);
  if (violation === 'break' || breakRequired) messages.push(`30-minute break required — ${minutesToClock(HOS_RULES.breakAfterMinutes)} elapsed.`);

  return {
    driveMinutes,
    driveLimitMinutes,
    driveRemainingMinutes: Math.max(0, driveRemaining),
    onDutyMinutes,
    onDutyLimitMinutes,
    onDutyRemainingMinutes: Math.max(0, onDutyRemaining),
    breakRemainingMinutes,
    onBreak,
    breakRequired,
    violation,
    messages,
  };
}

/** Builds a retained DVIR record from a completed inspection. */
export function buildDvirReport(opts: {
  scope: InspectionScope;
  entries: InspectionEntry[];
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleLabel: string;
  startedAt: string;
}): DvirReport {
  const defects = opts.entries
    .filter((e) => !e.passed)
    .map((e) => ({
      itemId: e.itemId,
      label: DEMO_INSPECTION_ITEMS.find((i) => i.id === e.itemId)?.label ?? e.itemId,
      note: e.issueNote,
    }));
  return {
    id: `dvir_${uid()}`,
    scope: opts.scope,
    driverId: opts.driverId,
    driverName: opts.driverName,
    vehicleId: opts.vehicleId,
    vehicleLabel: opts.vehicleLabel,
    entries: opts.entries,
    defects,
    startedAt: opts.startedAt,
    completedAt: new Date().toISOString(),
    certifiedAt: null,
  };
}

/** Canned, driver-friendly messages. Replace with configurable templates later. */
export const DISPATCH_TEMPLATES: DispatchTemplates = {
  arrivedSms: (stopName) => `Truck Buddy: Arrived at ${stopName}.`,
  completedSms: (stopName) => `Truck Buddy: Delivered at ${stopName}. Paperwork sent.`,
  docEmailSubject: (docNumber, type) => `${type} ${docNumber}`,
  docEmailBody: (docNumber, stopName, shipper, weight) =>
    `Attached bill of lading ${docNumber} — ${shipper}, ${weight.toLocaleString()} lbs, delivered at ${stopName}.`,
  repairTicketSubject: (truck, itemLabel) => `Repair needed: ${itemLabel} — ${truck}`,
  repairTicketBody: (truck, itemLabel, note) =>
    `Truck Buddy flagged ${itemLabel} during inspection (${truck}). Note: ${note}. Please advise if the driver should continue or stop for service.`,
  consigneeArrivalSms: (stopName, unit, driverName) =>
    `Truck Buddy: ${driverName}, unit ${unit}, has arrived at ${stopName} and is at the dock.`,
};
