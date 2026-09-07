import type {
  Contact,
  DiagnosticSample,
  DocumentType,
  DriverPrefs,
  InspectionItem,
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
  return Math.random().toString(36).slice(2, 10);
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
  return stop.destinations.reduce((total, d) => total + d.handlingMinutes, 0);
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
      raw: `0${fields.bol_number}\nSHIPPER: ${fields.shipper}\nCONSIGNEE: ${fields.consignee}\nWEIGHT: ${fields.weight} LBS`,
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
  return { ...DEFAULT_PREFS, ...(prefs ?? {}) };
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
  // Demo only: how long a fatigued driver must rest. Not an FMCSA rule.
  fatigueRestMinutes: 30,
} as const;

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
