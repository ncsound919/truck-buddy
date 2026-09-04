import Constants from 'expo-constants';
import type {
  Contact,
  DiagnosticSample,
  Dispatch,
  DocumentType,
  DriverPrefs,
  ParsedFields,
  RememberedStop,
  RouteStatus,
  TodaySession,
  TruckDocument,
  Vehicle,
} from '@/domain/types';
import { getLivePrefs } from './prefs-bridge';

/**
 * The mobile app's contract with the Truck Buddy backend.
 *
 * This interface mirrors the REST blueprint the backend will implement
 * (e.g. `GET /drivers/{driverId}/routes/today`, `PUT /stops/{stopId}/status`,
 * `POST /documents/{documentId}/ocr`). The driver app never talks to HTTP
 * directly — it talks to this seam, so swapping the mock for the real
 * `HttpTruckBuddyApi` is a drop-in change.
 */
export interface TruckBuddyApi {
  /** GET /drivers/{driverId}/routes/today + /auth/me + /drivers/{id} */
  getTodaySession(): Promise<TodaySession>;

  /** PUT /vehicles/{vehicleId}/assign/{driverId} */
  getAssignedVehicle(): Promise<Vehicle>;

  /** GET /vehicles/{vehicleId}/diagnostics (latest sample) */
  getLatestDiagnostic(vehicleId: string): Promise<DiagnosticSample>;

  /**
   * PUT /stops/{stopId}/status
   * Real impl fires when the geofence engine detects arrival.
   */
  updateStopStatus(stopId: string, status: 'arrived' | 'completed'): Promise<void>;

  /** PUT /routes/{routeId}/status */
  updateRouteStatus(routeId: string, status: RouteStatus): Promise<void>;

  /**
   * POST /documents/upload + POST /documents/{id}/ocr
   * Real impl uploads the image and runs the OCR pipeline. The mock returns
   * canned parsed fields so the UI flow is fully exercisable today.
   */
  ocrDocument(opts: { stopId?: string; type: DocumentType }): Promise<TruckDocument>;

  /* ------------------------- Driver Aids seam ------------------------- */

  /** GET /contacts — fleet + dispatch records. Real app also reads the device. */
  getContacts(): Promise<Contact[]>;

  /** GET /drivers/{driverId}/prefs — returns *seeds*; device overrides stored locally. */
  getPrefs(): Promise<DriverPrefs>;

  /** GET /drivers/{driverId}/remembered-stops — *seeds*; device is source of truth. */
  getRememberedStops(): Promise<RememberedStop[]>;

  /**
   * POST /dispatches — send an email / SMS / trigger a call-back.
   *
   * When `transport` is `'mock'` (default): writes an in-app DispatchMessage
   * only. Nothing reaches the network.
   *
   * When `transport` is `'live'`: POSTs to the Supabase Edge Function
   * `dispatch-send` which calls Resend. On failure or when the function URL
   * is not configured, falls back to the mock and marks the message `queued`.
   *
   * SMS and voice kinds are **not yet wired** — they return a 501 and the
   * message falls through to the mock. Wire them the same way when you add
   * Twilio/Bandwidth.
   */
  sendDispatch(message: Dispatch): Promise<Dispatch>;
}

export interface CreateDocumentResult {
  document: TruckDocument;
  parsedFields: ParsedFields;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface DispatchConfig {
  url: string;
  anonKey: string;
}

function getDispatchConfig(): DispatchConfig {
  const extra = Constants.expo?.extra as Record<string, string> | undefined;
  const base = extra?.supabaseUrl?.replace(/\/$/, '') ?? '';
  const path = extra?.dispatchFunctionPath ?? '/functions/v1/dispatch-send';
  return {
    url: base + path,
    anonKey: extra?.supabaseAnonKey ?? '',
  };
}

interface ResendResult {
  ok: boolean;
  transport: 'resend';
  id?: string;
  error?: string;
}

async function sendViaResend(
  message: Dispatch,
  config: DispatchConfig,
): Promise<{ sent: Dispatch; usedLive: boolean }> {
  const { url, anonKey } = config;
  if (!url || !anonKey) {
    throw new Error('dispatch-send function URL or anon key not configured');
  }

  const body: Record<string, string> = {
    kind: message.kind,
    to: message.to.email ?? message.to.phone ?? '',
    subject: message.subject,
    body: message.body ?? '',
    dispatchId: message.id,
  };
  if (message.category) body.category = message.category;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  let result: ResendResult = { ok: false, transport: 'resend', error: `HTTP ${res.status}` };
  try {
    result = await res.json() as ResendResult;
  } catch { /* ignore parse errors */ }

  if (!result.ok) {
    throw new Error(result.error ?? 'unknown error');
  }

  return {
    sent: { ...message, status: 'sent', at: new Date().toISOString() },
    usedLive: true,
  };
}

async function mockSend(message: Dispatch): Promise<Dispatch> {
  await new Promise((r) => setTimeout(r, 600));
  return { ...message, status: 'sent', at: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// In-memory mock. Everything the app reads is deterministic demo data;
// nothing reaches the network in mock mode. Latency is simulated so async
// loading states behave like production.
// ---------------------------------------------------------------------------
export class MockTruckBuddyApi implements TruckBuddyApi {
  constructor(private readonly sessionProvider: () => Promise<TodaySession>) {}

  async getTodaySession(): Promise<TodaySession> {
    return this.sessionProvider();
  }

  async getAssignedVehicle(): Promise<Vehicle> {
    const session = await this.sessionProvider();
    return session.vehicle;
  }

  async getLatestDiagnostic(_vehicleId: string): Promise<DiagnosticSample> {
    const { DEMO_OBD_SAMPLE } = await import('@/domain/data');
    return DEMO_OBD_SAMPLE;
  }

  async updateStopStatus(stopId: string, _status: 'arrived' | 'completed'): Promise<void> {
    void stopId;
  }

  async updateRouteStatus(_routeId: string, _status: RouteStatus): Promise<void> {
    // no-op in demo mode
  }

  async ocrDocument(opts: { stopId?: string; type: DocumentType }): Promise<TruckDocument> {
    const { DEMO_BOL_FIELDS, makeMockDocument } = await import('@/domain/data');
    await new Promise((r) => setTimeout(r, 900));
    const fields: ParsedFields = { ...DEMO_BOL_FIELDS };
    if (opts.stopId === 'stop_acme') {
      fields.bol_number = 'BOL-882114';
    }
    return makeMockDocument(opts.stopId, opts.type, fields);
  }

  async getContacts(): Promise<Contact[]> {
    const { DEMO_CONTACTS } = await import('@/domain/data');
    return DEMO_CONTACTS;
  }

  async getPrefs(): Promise<DriverPrefs> {
    const { DEFAULT_PREFS } = await import('@/domain/data');
    return { ...DEFAULT_PREFS };
  }

  async getRememberedStops(): Promise<RememberedStop[]> {
    const { DEMO_REMEMBERED_STOPS } = await import('@/domain/data');
    return DEMO_REMEMBERED_STOPS.map((s) => ({ ...s }));
  }

  async sendDispatch(message: Dispatch): Promise<Dispatch> {
    const prefs = getLivePrefs();
    if (prefs.dispatchTransport === 'live' && message.kind === 'email') {
      try {
        const { sent } = await sendViaResend(message, getDispatchConfig());
        return sent;
      } catch (err) {
        const note = err instanceof Error ? err.message : String(err);
        console.warn('[dispatch-send] live path failed, falling back to mock:', note);
        return { ...message, status: 'queued', at: new Date().toISOString() };
      }
    }
    return mockSend(message);
  }
}
