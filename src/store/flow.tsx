import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import { setLivePrefs } from '@/services/prefs-bridge';
import { DEMO_INSPECTION_ITEMS, DISPATCH_TEMPLATES, HOS_RULES, makeDemoRoute, normalizePrefs, uid } from '@/domain/data';
import type {
  Contact,
  DayClock,
  DetentionClaim,
  DiagnosticSample,
  Dispatch,
  DispatchCategory,
  DispatchKind,
  DriverPrefs,
  FatigueLevel,
  InspectionEntry,
  InspectionScope,
  RememberedStop,
  Route,
  Stop,
  TodaySession,
  TruckDocument,
  Vehicle,
  WorkflowStep,
} from '@/domain/types';
import { haptic } from '@/services/haptics';
import { memory } from '@/services/memory';
import { TruckBuddyApi } from '@/services/truck-buddy-api';
import { announce, stopVoice } from '@/services/voice';

/** Deep clone helper for plain-data state (avoids relying on Hermes `structuredClone`). */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface FlowState {
  booted: boolean;
  session: TodaySession | null;
  step: WorkflowStep;
  route: Route | null;
  inspectionScope: InspectionScope;
  inspectionIndex: number;
  inspectionEntries: InspectionEntry[];
  activeStopIndex: number;
  docs: TruckDocument[];
  obdSample: DiagnosticSample | null;
  scanning: boolean;
  lastScan: TruckDocument | null;

  // Driver Aids (see src/domain/types.ts)
  prefs: DriverPrefs | null;
  contacts: Contact[];
  rememberedStops: RememberedStop[];
  aidLog: Dispatch[];

  // Time, fatigue & detention (cab-side run tracking)
  /** ISO of arrival at the active stop (drives detention logging). */
  arrivalAt: string | null;
  /** How the current arrival was detected (drives honest arrival copy). */
  arrivalVia: 'gps' | 'manual' | null;
  dayClock: DayClock;
  detention: DetentionClaim[];
  /** True once a non-OK fault has been auto-reported to fleet this shift. */
  faultAlertSent: boolean;
}

function initialState(): FlowState {
  return {
    booted: false,
    session: null,
    step: 'idle',
    route: null,
    inspectionScope: 'pretrip',
    inspectionIndex: 0,
    inspectionEntries: [],
    activeStopIndex: 0,
    docs: [],
    obdSample: null,
    scanning: false,
    lastScan: null,
    prefs: null,
    contacts: [],
    rememberedStops: [],
    aidLog: [],
    arrivalAt: null,
  arrivalVia: null,
    dayClock: { shiftStartedAt: null, breakStartedAt: null, fatigueChecks: [] },
    detention: [],
    faultAlertSent: false,
  };
}

export type FlowAction =
  | { type: 'BOOT_OK'; session: TodaySession }
  | { type: 'RESET' }
  | { type: 'START_SHIFT' }
  | { type: 'INSPECTION_PASS' }
  | { type: 'INSPECTION_ISSUE'; note?: string }
  | { type: 'INSPECTION_BACK' }
  | { type: 'SIMULATE_ARRIVE'; via?: 'gps' | 'manual' }
  | { type: 'GO_BACK_ON_ROAD' }
  | { type: 'OPEN_SCAN' }
  | { type: 'CANCEL_SCAN' }
  | { type: 'CAPTURE_START' }
  | { type: 'CAPTURE_DONE'; doc: TruckDocument }
  | { type: 'COMPLETE_STOP' }
  | { type: 'END_SHIFT' }
  | { type: 'SET_OBD'; sample: DiagnosticSample }
  | {
      type: 'AIDS_READY';
      prefs: DriverPrefs;
      contacts: Contact[];
      rememberedStops: RememberedStop[];
      aidLog: Dispatch[];
    }
  | { type: 'SET_PREFS'; patch: Partial<DriverPrefs> }
  | { type: 'REMEMBER_STOP'; stop: RememberedStop }
  | { type: 'FORGET_STOP'; id: string }
  | { type: 'LOG_DISPATCH'; dispatch: Dispatch }
  | { type: 'MARK_DISPATCH'; id: string; dispatch: Dispatch }
  | { type: 'RUN_READY'; dayClock: DayClock; detention: DetentionClaim[] }
  | { type: 'START_BREAK' }
  | { type: 'END_BREAK' }
  | { type: 'LOG_FATIGUE'; level: FatigueLevel }
  | { type: 'SET_FAULT_ALERT' };

/** Marks the active stop complete and moves to the next stop, post-trip, or summary. */
function advanceAfterStop(draft: FlowState): void {
  const stop = draft.route?.stops[draft.activeStopIndex];
  if (stop) {
    stop.status = 'completed';
    stop.completedAt = new Date().toISOString();
  }
  const nextIndex = draft.route?.stops.findIndex((s) => s.status === 'pending') ?? -1;
  if (nextIndex === -1) {
    draft.step = 'posttrip';
    draft.inspectionScope = 'posttrip';
    draft.inspectionIndex = 0;
    draft.inspectionEntries = [];
    if (draft.route) draft.route.status = 'completed';
  } else {
    draft.activeStopIndex = nextIndex;
    draft.step = 'navigating';
  }
}

function recordInspection(draft: FlowState, passed: boolean, issueNote?: string): void {
  const item = DEMO_INSPECTION_ITEMS[draft.inspectionIndex];
  if (item) {
    draft.inspectionEntries = [
      ...draft.inspectionEntries,
      { itemId: item.id, passed, issueNote, at: new Date().toISOString() },
    ];
  }
  const isLast = draft.inspectionIndex >= DEMO_INSPECTION_ITEMS.length - 1;
  if (isLast) {
    if (draft.inspectionScope === 'pretrip') {
      draft.step = 'navigating';
      if (draft.route) draft.route.status = 'in_progress';
    } else {
      draft.step = 'summary';
    }
  } else {
    draft.inspectionIndex += 1;
  }
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  const draft = clone(state);

  switch (action.type) {
    case 'BOOT_OK':
      draft.booted = true;
      draft.session = action.session;
      draft.route = clone(action.session.route);
      return draft;

    case 'RESET': {
      const fresh = initialState();
      return {
        ...fresh,
        booted: true,
        session: draft.session,
        route: makeDemoRoute(),
      };
    }

    case 'START_SHIFT': {
      draft.step = 'pretrip';
      draft.inspectionScope = 'pretrip';
      draft.inspectionIndex = 0;
      draft.inspectionEntries = [];
      draft.faultAlertSent = false;
      // Start the on-duty clock on the first shift of the stored day.
      if (!draft.dayClock.shiftStartedAt) {
        draft.dayClock = { ...draft.dayClock, shiftStartedAt: new Date().toISOString(), breakStartedAt: null };
      }
      return draft;
    }

    case 'INSPECTION_PASS':
      recordInspection(draft, true);
      return draft;

    case 'INSPECTION_ISSUE':
      recordInspection(draft, false, action.note || 'Voice note');
      return draft;

    case 'INSPECTION_BACK':
      if (draft.inspectionIndex > 0) draft.inspectionIndex -= 1;
      return draft;

    case 'SIMULATE_ARRIVE': {
      const stop = draft.route?.stops[draft.activeStopIndex];
      if (stop && stop.status === 'pending') stop.status = 'arrived';
      draft.step = 'arrived';
      draft.arrivalAt = new Date().toISOString();
      draft.arrivalVia = action.via ?? 'manual';
      return draft;
    }

    case 'GO_BACK_ON_ROAD': {
      const stop = draft.route?.stops[draft.activeStopIndex];
      if (stop && stop.status === 'arrived') stop.status = 'pending';
      draft.step = 'navigating';
      draft.arrivalAt = null;
      draft.arrivalVia = null;
      return draft;
    }

    case 'OPEN_SCAN':
      draft.step = 'scan';
      draft.lastScan = null;
      return draft;

    case 'CANCEL_SCAN':
      draft.step = 'arrived';
      draft.scanning = false;
      return draft;

    case 'CAPTURE_START':
      draft.scanning = true;
      return draft;

    case 'CAPTURE_DONE': {
      draft.scanning = false;
      draft.lastScan = action.doc;
      const currentStopId = draft.route?.stops[draft.activeStopIndex]?.id;
      const stopId = action.doc.stopId ?? currentStopId;
      const exists = draft.docs.some((d) => d.id === action.doc.id);
      if (!exists) {
        draft.docs = [...draft.docs, { ...action.doc, stopId }];
      }
      return draft;
    }

    case 'COMPLETE_STOP': {
      // Log detention for the stop being completed (time since arrival).
      if (draft.arrivalAt) {
        const stop = draft.route?.stops[draft.activeStopIndex];
        if (stop) {
          const startMs = new Date(draft.arrivalAt).getTime();
          const minutes = Math.max(0, Math.round((Date.now() - startMs) / 60000));
          const claim: DetentionClaim = {
            id: `det_${uid()}`,
            stopId: stop.id,
            stopName: stop.name,
            startedAt: draft.arrivalAt,
            endedAt: new Date().toISOString(),
            elapsedMinutes: minutes,
          };
          draft.detention = [claim, ...draft.detention];
        }
        draft.arrivalAt = null;
      }
      advanceAfterStop(draft);
      return draft;
    }

    case 'END_SHIFT':
      draft.step = 'ended';
      return draft;

    case 'SET_OBD':
      draft.obdSample = action.sample;
      return draft;

    case 'AIDS_READY':
      draft.prefs = action.prefs;
      draft.contacts = action.contacts;
      draft.rememberedStops = action.rememberedStops;
      draft.aidLog = action.aidLog;
      return draft;

    case 'RUN_READY':
      draft.dayClock = action.dayClock;
      draft.detention = action.detention;
      return draft;

    case 'START_BREAK':
      draft.dayClock = {
        ...draft.dayClock,
        breakStartedAt: draft.dayClock.breakStartedAt ?? new Date().toISOString(),
      };
      return draft;

    case 'END_BREAK':
      draft.dayClock = { ...draft.dayClock, breakStartedAt: null };
      return draft;

    case 'LOG_FATIGUE':
      draft.dayClock = {
        ...draft.dayClock,
        fatigueChecks: [
          ...draft.dayClock.fatigueChecks,
          { at: new Date().toISOString(), level: action.level },
        ].slice(-30),
      };
      return draft;

    case 'SET_FAULT_ALERT':
      draft.faultAlertSent = true;
      return draft;

    case 'SET_PREFS':
      draft.prefs = { ...(draft.prefs ?? ({} as DriverPrefs)), ...action.patch };
      return draft;

    case 'REMEMBER_STOP': {
      const existing = draft.rememberedStops.findIndex(
        (s) => s.id === action.stop.id || s.name === action.stop.name,
      );
      if (existing >= 0) {
        draft.rememberedStops[existing] = action.stop;
      } else {
        draft.rememberedStops = [action.stop, ...draft.rememberedStops];
      }
      return draft;
    }

    case 'FORGET_STOP':
      draft.rememberedStops = draft.rememberedStops.filter((s) => s.id !== action.id);
      return draft;

    case 'LOG_DISPATCH':
      draft.aidLog = [action.dispatch, ...draft.aidLog].slice(0, 60);
      return draft;

    case 'MARK_DISPATCH':
      draft.aidLog = draft.aidLog.map((d) => (d.id === action.id ? action.dispatch : d));
      return draft;

    default:
      return state;
  }
}

export interface FlowController {
  state: FlowState;
  driverName: string;
  vehicle: Vehicle | null;
  currentStop: Stop | null;
  currentStopLabel: string;
  stopHasDocument: boolean;
  completedStopCount: number;
  totalStopCount: number;
  reset: () => void;
  startShift: () => void;
  inspectionPass: () => void;
  inspectionIssue: (note?: string) => void;
  inspectionBack: () => void;
  arrive: () => void;
  /** GPS geofence detected the arrival (same flow, honest arrival copy). */
  arriveViaGps: () => void;
  backOnRoad: () => void;
  openScan: () => void;
  cancelScan: () => void;
  capture: (type: TruckDocument['type']) => Promise<void>;
  /** Commit a document produced by the real on-device OCR path (not the mock API). */
  commitCapture: (doc: TruckDocument) => void;
  completeStop: () => void;
  endShift: () => void;
  readTruckHealth: () => string | null;

  // Time, fatigue, detention & triage (cab-side run tracking)
  onBreak: boolean;
  /** Whole minutes on duty at `now` (ms epoch), excluding an active break. */
  onDutyMinutesAt: (now: number) => number;
  /** Minutes left in the break at `now`, or 0 when not on a break. */
  breakRemainingMinutesAt: (now: number) => number;
  detentionCount: number;
  detentionTotalMinutes: number;
  faultTriage: () => { summary: string; canContinue: boolean; severity: 'ok' | 'caution' | 'stop' };
  startBreak: () => void;
  endBreak: () => void;
  logFatigue: (level: FatigueLevel) => void;

  // Driver Aids (one-handed outreach + memory)
  setPref: (patch: Partial<DriverPrefs>) => void;
  notifyArrival: (contactId?: string) => Promise<void>;
  sendDocEmail: (doc: TruckDocument, contactId?: string) => Promise<void>;
  readBackDoc: (doc: TruckDocument) => void;
  rememberCurrentStop: (note?: string) => void;
  forgetRememberedStop: (id: string) => void;
}

const FlowContext = createContext<FlowController | null>(null);

export function FlowProvider({
  children,
  api,
}: {
  children: React.ReactNode;
  api: TruckBuddyApi;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const bootedRef = useRef(false);
  const aidsBootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    void (async () => {
      try {
        const session = await api.getTodaySession();
        dispatch({ type: 'BOOT_OK', session });
        const sample = await api.getLatestDiagnostic(session.vehicle.id).catch(() => null);
        if (sample) dispatch({ type: 'SET_OBD', sample });
      } catch {
        // Real impl shows an error banner; the mock never fails.
      }
    })();
  }, [api]);

  // Hydrate Driver Aids: fleet seeds from the API, driver memory from the device.
  useEffect(() => {
    if (aidsBootedRef.current) return;
    aidsBootedRef.current = true;
    void (async () => {
      const [contacts, prefsSeed, rememberSeed, storedPrefs, storedRemembered, storedLog] =
        await Promise.all([
          api.getContacts().catch(() => [] as Contact[]),
          api.getPrefs().catch(() => null),
          api.getRememberedStops().catch(() => [] as RememberedStop[]),
          memory.loadPrefs(),
          memory.loadRemembered(),
          memory.loadLog(),
        ]);
      const prefs = normalizePrefs(storedPrefs ?? prefsSeed);
      const rememberedStops = storedRemembered ?? rememberSeed;
      const aidLog = storedLog ?? [];
      dispatch({ type: 'AIDS_READY', prefs, contacts, rememberedStops, aidLog });
    })();
  }, [api]);

  // Persist driver memory whenever it changes (after first hydration).
  useEffect(() => {
    if (!state.booted || !state.prefs) return;
    setLivePrefs(state.prefs);
    void memory.savePrefs(state.prefs);
    void memory.saveRemembered(state.rememberedStops);
    void memory.saveLog(state.aidLog);
    void memory.saveClock(state.dayClock);
    void memory.saveDetention(state.detention);
  }, [
    state.booted,
    state.prefs,
    state.rememberedStops,
    state.aidLog,
    state.dayClock,
    state.detention,
  ]);

  // Hydrate the run clock + detention log from device storage.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [dayClock, detention] = await Promise.all([
        memory.loadClock(),
        memory.loadDetention(),
      ]);
      if (cancelled) return;
      const clock: DayClock =
        dayClock ?? { shiftStartedAt: null, breakStartedAt: null, fatigueChecks: [] };
      dispatch({ type: 'RUN_READY', dayClock: clock, detention: detention ?? [] });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Outbox: retry queued dispatches when the app comes foreground.
  // Anything still failing stays queued with its error in the activity log.
  const liveRef = useRef({ api, prefs: state.prefs, aidLog: state.aidLog });
  useEffect(() => {
    liveRef.current = { api, prefs: state.prefs, aidLog: state.aidLog };
  });
  useEffect(() => {
    let cancelled = false;
    const retryQueued = async () => {
      const { api: liveApi, prefs, aidLog } = liveRef.current;
      if (!prefs || prefs.dispatchTransport !== 'live') return;
      const queued = aidLog.filter((d) => d.status === 'queued');
      for (const msg of queued) {
        if (cancelled) return;
        try {
          const sent = await liveApi.sendDispatch(msg);
          if (sent.status !== 'queued') {
            dispatch({ type: 'MARK_DISPATCH', id: msg.id, dispatch: sent });
          }
        } catch {
          // stays queued; next foreground retry picks it up
        }
      }
    };
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void retryQueued();
    });
    void retryQueued();
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const controller = useMemo<FlowController>(() => {
    const stops = state.route?.stops ?? [];
    const currentStop = stops[state.activeStopIndex] ?? null;
    const stopHasDocument =
      !!currentStop && state.docs.some((d) => d.stopId === currentStop.id);
    const currentStopLabel = currentStop
      ? `Stop ${currentStop.sequence} of ${stops.length}`
      : '';

    // Driver Aid helpers (shared by the controller methods below).
    const driverId = state.session?.driver.id ?? '';
    // Resolve driver-entered phone/carrier overrides over the seeded contacts.
    const contacts = state.contacts.map((c) => ({
      ...c,
      phone: state.prefs?.contactPhones[c.id] ?? c.phone,
      smsCarrier: state.prefs?.smsCarriers[c.id] ?? c.smsCarrier,
    }));
    const arrivalTarget = (contactId?: string): Contact | null => {
      if (contactId) return contacts.find((c) => c.id === contactId) ?? null;
      if (!currentStop) return null;
      const first = currentStop.name.split(' ')[0].toLowerCase();
      const byName = contacts.find(
        (c) => c.label.toLowerCase().split(' ')[0] === first || c.label.toLowerCase().includes(first),
      );
      return byName ?? contacts.find((c) => c.role === 'dispatch') ?? null;
    };
    const logDispatch = async (
      kind: DispatchKind,
      to: Contact,
      subject: string,
      body?: string,
      category?: DispatchCategory,
    ) => {
      const msg: Dispatch = {
        id: `dsp_${uid()}`,
        kind,
        driverId,
        to,
        subject,
        body,
        status: 'queued',
        at: new Date().toISOString(),
        category,
      };
      if (kind === 'sms' && to.smsCarrier) msg.carrier = to.smsCarrier;
      const sent = await api.sendDispatch(msg).catch(() => msg);
      dispatch({ type: 'LOG_DISPATCH', dispatch: sent });
      return sent;
    };

    const fleetContact = contacts.find((c) => c.role === 'dispatch') ?? null;
    const vehicleLabel = state.session?.vehicle
      ? `${state.session.vehicle.year} ${state.session.vehicle.make} ${state.session.vehicle.model}`
      : 'Truck';
    // Issue -> repair ticket: auto-email the fleet when an item is flagged.
    const dispatchRepair = (itemLabel: string, note: string) => {
      if (!fleetContact?.email) return;
      void logDispatch(
        'email',
        fleetContact,
        DISPATCH_TEMPLATES.repairTicketSubject(vehicleLabel, itemLabel),
        DISPATCH_TEMPLATES.repairTicketBody(vehicleLabel, itemLabel, note),
        'repair',
      );
    };
    const itemLabelAt = (i: number) => DEMO_INSPECTION_ITEMS[i]?.label ?? 'item';

    // Auto-pilot: remember the doc-forward recipient and fire it silently on attach.
    const docForwardContact = (() => {
      const id = state.prefs?.docForwardToContactId;
      return id ? contacts.find((c) => c.id === id) ?? null : null;
    })();
    const autoForwardDoc = (doc: TruckDocument) => {
      if (!state.prefs?.forwardDocsOnAttach || !docForwardContact?.email) return;
      const p = doc.parsedFields;
      void logDispatch(
        'email',
        docForwardContact,
        DISPATCH_TEMPLATES.docEmailSubject(p.bol_number, doc.type),
        DISPATCH_TEMPLATES.docEmailBody(p.bol_number, currentStop?.name ?? 'stop', p.shipper, p.weight),
        'paperwork',
      );
    };
    // Auto EOD: send the fleet a one-line recap at shift end.
    const sendEod = () => {
      if (!state.prefs?.sendEodReport || !fleetContact?.email) return;
      const stops = state.route?.stops ?? [];
      const completed = stops.filter((s) => s.status === 'completed').length;
      const waitMin = state.detention.reduce((a, d) => a + d.elapsedMinutes, 0);
      const miles = stops.filter((s) => s.status === 'completed').reduce((a, s) => a + s.legMiles, 0);
      const body = `Stops ${completed}/${stops.length}. Docs ${state.docs.length}. Detention ${waitMin} min. Miles ${miles}.`;
      void logDispatch('email', fleetContact, 'End-of-day report', body, 'paperwork');
    };
    // Auto fault alert: tell the fleet once per shift when the truck isn't nominal.
    const maybeFleetFaultAlert = () => {
      if (!state.prefs?.autoMode || state.faultAlertSent || !fleetContact?.email) return;
      const triage = state.obdSample
        ? (() => {
            const { metrics, faultCodes } = state.obdSample as NonNullable<typeof state.obdSample>;
            const hot = metrics.coolant_temp > 230;
            const lowBat = metrics.battery_voltage < 12;
            const stop = hot;
            return { stop, caution: faultCodes.length > 0 || lowBat };
          })()
        : { stop: false, caution: false };
      if (!triage.stop && !triage.caution) return;
      dispatch({ type: 'SET_FAULT_ALERT' });
      void logDispatch(
        'email',
        fleetContact,
        `Truck alert: ${state.session?.vehicle?.plate ?? 'unit'} needs attention`,
        triage.stop
          ? 'Critical: coolant or battery fault. Advise driver to pull over.'
          : 'Non-critical fault code present. Flag for service at next stop.',
        'repair',
      );
    };

    // Shared arrival side-effects for manual + GPS arrivals.
    const arriveAids = () => {
      haptic('arrive');
      announce('You have arrived.');
      // Auto text when the driver has it enabled (memory: pref).
      if (state.prefs?.autoNotifyOnArrival && currentStop) {
        const target = arrivalTarget();
        if (target) {
          void logDispatch(
            'sms',
            target,
            `Arrived at ${currentStop.name}`,
            DISPATCH_TEMPLATES.arrivedSms(currentStop.name),
          );
        }
      }
      // GATED external notify: text the consignee (third party) on arrival.
      if (state.prefs?.notifyConsigneeOnArrival && currentStop) {
        const first = currentStop.name.split(' ')[0].toLowerCase();
        const consignee = contacts.find(
          (c) => c.role !== 'dispatch' && c.label.toLowerCase().split(' ')[0] === first,
        );
        if (consignee?.phone) {
          void logDispatch(
            'sms',
            consignee,
            `Arrived at ${currentStop.name}`,
            DISPATCH_TEMPLATES.consigneeArrivalSms(
              currentStop.name,
              state.session?.vehicle?.plate ?? 'unit',
              state.session?.driver.name ?? 'Driver',
            ),
          );
        }
      }
    };

    return {
      state,
      driverName: state.session?.driver.name ?? 'Driver',
      vehicle: state.session?.vehicle ?? null,
      currentStop,
      currentStopLabel,
      stopHasDocument,
      completedStopCount: stops.filter((s) => s.status === 'completed').length,
      totalStopCount: stops.length,
      reset: () => {
        stopVoice();
        dispatch({ type: 'RESET' });
      },
      startShift: () => {
        dispatch({ type: 'START_SHIFT' });
        haptic('confirm');
        announce('Shift started. Pre-trip inspection first.');
        maybeFleetFaultAlert();
      },
      inspectionPass: () => {
        dispatch({ type: 'INSPECTION_PASS' });
        haptic('selection');
      },
      inspectionIssue: (note?: string) => {
        dispatch({ type: 'INSPECTION_ISSUE', note });
        haptic('alert');
        // Auto-raise a repair ticket to the fleet for the flagged item.
        dispatchRepair(itemLabelAt(state.inspectionIndex), note ?? 'Voice note');
      },
      inspectionBack: () => dispatch({ type: 'INSPECTION_BACK' }),
      arrive: () => {
        dispatch({ type: 'SIMULATE_ARRIVE', via: 'manual' });
        arriveAids();
      },
      arriveViaGps: () => {
        dispatch({ type: 'SIMULATE_ARRIVE', via: 'gps' });
        arriveAids();
      },
      backOnRoad: () => {
        dispatch({ type: 'GO_BACK_ON_ROAD' });
        haptic('selection');
      },
      openScan: () => {
        dispatch({ type: 'OPEN_SCAN' });
        haptic('selection');
      },
      cancelScan: () => {
        dispatch({ type: 'CANCEL_SCAN' });
        haptic('selection');
      },
      capture: async (type: TruckDocument['type']) => {
        const stopId = stops[state.activeStopIndex]?.id;
        dispatch({ type: 'CAPTURE_START' });
        try {
          const doc = await api.ocrDocument({ stopId, type });
          dispatch({ type: 'CAPTURE_DONE', doc });
          haptic('taskComplete');
          if (state.prefs?.readBackOnCapture) {
            const p = doc.parsedFields;
            announce(
              `Document captured and verified. Bill of lading ${p.bol_number}, shipper ${p.shipper}, ${p.weight.toLocaleString()} pounds.`,
            );
          } else {
            announce('Document captured and verified.');
          }
          // Auto-pilot: silently forward the paperwork to the saved recipient.
          autoForwardDoc(doc);
        } catch {
          haptic('reject');
          dispatch({ type: 'CANCEL_SCAN' });
        }
      },
      commitCapture: (doc) => {
        dispatch({ type: 'CAPTURE_DONE', doc });
        haptic('taskComplete');
        if (state.prefs?.readBackOnCapture) {
          const p = doc.parsedFields;
          announce(
            `Document captured. Bill of lading ${p.bol_number}, ${p.weight.toLocaleString()} pounds, ${doc.parsedFields.consignee}.`,
          );
        } else {
          announce('Document captured.');
        }
        // Auto-pilot: silently forward the paperwork to the saved recipient.
        autoForwardDoc(doc);
      },
      completeStop: () => {
        dispatch({ type: 'COMPLETE_STOP' });
        haptic('taskComplete');
        announce('Stop complete.');
      },
      endShift: () => {
        // Auto-pilot: send the end-of-day report to fleet before we sign off.
        if (state.prefs?.autoMode) sendEod();
        dispatch({ type: 'END_SHIFT' });
        haptic('taskComplete');
        announce('Shift complete. Stay safe out there.');
      },
      readTruckHealth: () => {
        const sample = state.obdSample;
        if (!sample) return null;
        const { metrics, faultCodes } = sample;
        const issues: string[] = [];
        if (faultCodes.length) issues.push(`${faultCodes.length} active fault code(s)`);
        if (metrics.coolant_temp > 230) issues.push('coolant temperature high');
        if (metrics.battery_voltage < 12) issues.push('battery voltage low');
        return issues.length
          ? `Attention: ${issues.join(', ')}. Safe to continue.`
          : 'Truck health nominal. Engine, coolant and battery all good.';
      },

      // ----- Driver Aid controller methods -----
      setPref: (patch) => {
        dispatch({ type: 'SET_PREFS', patch });
        haptic('selection');
      },
      notifyArrival: async (contactId) => {
        const to = arrivalTarget(contactId);
        if (!to || !currentStop) {
          haptic('reject');
          return;
        }
        const subject = `Arrived at ${currentStop.name}`;
        const sent = await logDispatch('sms', to, subject, DISPATCH_TEMPLATES.arrivedSms(currentStop.name));
        haptic('taskComplete');
        announce(
          sent.status === 'sent'
            ? `Arrival text sent to ${to.label}.`
            : `Arrival text queued for ${to.label}. It will send when connected.`,
        );
      },
      sendDocEmail: async (doc, contactId) => {
        const targetId = contactId ?? state.prefs?.docForwardToContactId ?? null;
        const to = targetId ? contacts.find((c) => c.id === targetId) : null;
        if (!to?.email) {
          haptic('reject');
          announce('No email recipient set for paperwork.');
          return;
        }
        const p = doc.parsedFields;
        const sent = await logDispatch(
          'email',
          to,
          DISPATCH_TEMPLATES.docEmailSubject(p.bol_number, doc.type),
          DISPATCH_TEMPLATES.docEmailBody(
            p.bol_number,
            currentStop?.name ?? 'stop',
            p.shipper,
            p.weight,
          ),
        );
        haptic('taskComplete');
        announce(
          sent.status === 'sent'
            ? `Paperwork ${p.bol_number} emailed to ${to.label}.`
            : `Paperwork ${p.bol_number} queued for ${to.label}. It will send when connected.`,
        );
      },
      readBackDoc: (doc) => {
        const p = doc.parsedFields;
        haptic('selection');
        announce(
          `Bill of lading ${p.bol_number}. Shipper ${p.shipper}. Consignee ${p.consignee}. ${p.weight.toLocaleString()} pounds.`,
        );
      },
      rememberCurrentStop: (note) => {
        const s = currentStop;
        if (!s) return;
        const existing = state.rememberedStops.find((r) => r.name === s.name);
        const stop: RememberedStop = {
          id: existing?.id ?? `mem_${uid()}`,
          name: s.name,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          geofenceMeters: s.geofenceMeters,
          note: note ?? existing?.note,
          savedAt: existing?.savedAt ?? new Date().toISOString(),
          uses: (existing?.uses ?? 0) + 1,
        };
        dispatch({ type: 'REMEMBER_STOP', stop });
        haptic('confirm');
        announce(`${s.name} remembered.`);
      },
      forgetRememberedStop: (id) => {
        dispatch({ type: 'FORGET_STOP', id });
        haptic('selection');
        announce('Stop removed from memory.');
      },

      // ----- Time, fatigue, detention & fault triage -----
      onBreak: !!state.dayClock.breakStartedAt,
      onDutyMinutesAt: (now) => {
        const c = state.dayClock;
        if (!c.shiftStartedAt) return 0;
        const start = new Date(c.shiftStartedAt).getTime();
        const end = c.breakStartedAt
          ? Math.min(now, new Date(c.breakStartedAt).getTime())
          : now;
        return Math.max(0, Math.floor((end - start) / 60000));
      },
      breakRemainingMinutesAt: (now) => {
        const c = state.dayClock;
        if (!c.breakStartedAt) return 0;
        const ms = HOS_RULES.breakMinutes * 60000 - (now - new Date(c.breakStartedAt).getTime());
        return Math.max(0, Math.ceil(ms / 60000));
      },
      detentionCount: state.detention.length,
      detentionTotalMinutes: state.detention.reduce((a, d) => a + d.elapsedMinutes, 0),
      faultTriage: () => {
        const sample = state.obdSample;
        if (!sample) {
          return { summary: 'Truck health data unavailable.', canContinue: true, severity: 'ok' as const };
        }
        const { metrics, faultCodes } = sample;
        const hot = metrics.coolant_temp > 230;
        const lowBat = metrics.battery_voltage < 12;
        const stop = hot;
        const caution = faultCodes.length > 0 || lowBat;
        const summary = stop
          ? `Coolant ${metrics.coolant_temp} degrees. Pull over and shut down, then call fleet.`
          : caution
            ? `Caution: ${faultCodes.length} fault code${faultCodes.length === 1 ? '' : 's'}${lowBat ? ' and low battery' : ''}. Safe to continue to the next stop, then have it checked.`
            : 'No active fault codes. Safe to continue.';
        return {
          summary,
          canContinue: !stop,
          severity: stop ? 'stop' : caution ? 'caution' : 'ok',
        };
      },
      startBreak: () => {
        dispatch({ type: 'START_BREAK' });
        haptic('selection');
        announce('Break started. Thirty minutes on the clock.');
      },
      endBreak: () => {
        dispatch({ type: 'END_BREAK' });
        haptic('confirm');
        announce('Break over. Back to it.');
      },
      logFatigue: (level) => {
        dispatch({ type: 'LOG_FATIGUE', level });
        haptic('selection');
        if (level >= 4) announce('You reported high fatigue. Consider a break soon.');
      },
    };
  }, [state, api]);

  return <FlowContext.Provider value={controller}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowController {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be used inside <FlowProvider>');
  return ctx;
}
