import type { MechanicResult, ResolvedCode, Step, SymptomId, Triage } from './domain';

/*
 * Curated J1939 SPN library. Each entry is grounded heavy-duty trucking
 * knowledge, NOT generated per-code. Codes outside this list are surfaced as
 * "unknown" with an honest path (research + OEM) rather than a fabricated fix.
 */
type SpnEntry = {
  name: string;
  system: string;
  plain: string;
  severity: Triage;
  keepDriving: string;
  causes: { title: string; detail: string; likelihood: 'high' | 'medium' | 'low' }[];
  steps: Step[];
};

const SPN_LIBRARY: Record<number, SpnEntry> = {
  100: {
    name: 'Engine Oil Pressure',
    system: 'Lubrication',
    plain: 'The ECM reports low or lost engine oil pressure. Low oil pressure can destroy bearings and the engine quickly.',
    severity: 'red',
    keepDriving: 'Do not operate. Shut the engine down and investigate before running again.',
    causes: [
      { title: 'Low oil level', detail: 'Oil not registering on the dipstick or below safe operating level.', likelihood: 'high' },
      { title: 'Oil leak', detail: 'A pressurized leak draining the sump — look under and around the engine.', likelihood: 'medium' },
      { title: 'Failed oil pressure sensor or sender', detail: 'A faulty sensor can read low while actual pressure is fine.', likelihood: 'medium' },
      { title: 'Worn pump or pickup', detail: 'Loss of pressure at the pump, pickup screen, or relief valve.', likelihood: 'low' },
    ],
    steps: [
      { order: 1, title: 'Shut the engine down', detail: 'Do not continue driving. Idle-down and stop as soon as it is safe to do so.', safety: true },
      { order: 2, title: 'Check the dipstick', detail: 'Wipe, reinsert, and read. Top up with the correct viscosity if low.', tool: 'Dipstick', time: '2 min' },
      { order: 3, title: 'Inspect for leaks', detail: 'Look under the truck and around the oil filter, drain plug, and lines for fresh oil.', time: '5 min' },
      { order: 4, title: 'Re-run with an eye on the gauge', detail: 'If pressure is still low at idle with oil full, do not drive — this needs a mechanic.', safety: true },
    ],
  },
  110: {
    name: 'Engine Coolant Temperature',
    system: 'Cooling',
    plain: 'Engine coolant temperature is above normal. Overheating risks a head gasket, liner, or total engine failure.',
    severity: 'red',
    keepDriving: 'Safe to pull over. If it is actively overheating, shut down; do not "top up cold on a hot engine".',
    causes: [
      { title: 'Low coolant / leak', detail: 'Coolant loss from a hose, radiator, or water pump.', likelihood: 'high' },
      { title: 'Fan or belt failure', detail: 'Fan not engaging or belt slipping so airflow stops.', likelihood: 'medium' },
      { title: 'Thermostat stuck closed', detail: 'Coolant is not circulating through the radiator.', likelihood: 'medium' },
      { title: 'Clogged radiator / shutter', detail: 'Restricted airflow or blocked cooling fins.', likelihood: 'low' },
    ],
    steps: [
      { order: 1, title: 'Pull over and idle', detail: 'If safe, idle the engine to let the fan pull air. Shut down if the gauge keeps climbing.', safety: true, time: '3–5 min' },
      { order: 2, title: 'Let it cool before opening anything', detail: 'Never open the radiator cap on a hot system — scalding coolant can erupt.', safety: true },
      { order: 3, title: 'Check coolant level (cold)', detail: 'Top the reservoir to the cold mark with the approved coolant/water mix.', tool: 'Coolant + funnel', time: '5 min' },
      { order: 4, title: 'Verify fan and belt', detail: 'Confirm the viscous fan is locked up when hot and the belt is intact and tight.', time: '5 min' },
      { order: 5, title: 'Re-run watching the temperature', detail: 'If it climbs again under load, park it — further driving risks major damage.', safety: true },
    ],
  },
  111: {
    name: 'Engine Coolant Level',
    system: 'Cooling',
    plain: 'The ECM reports low engine coolant level. Low coolant leads to the overheating condition above.',
    severity: 'yellow',
    keepDriving: 'Check and correct the level soon. Continuing with a low level risks overheating.',
    causes: [
      { title: 'Slow coolant loss', detail: 'A seep or small leak that has not yet surfaced as a puddle.', likelihood: 'medium' },
      { title: 'Sensor fault', detail: 'Level sensor float stuck or wiring fault giving a false low reading.', likelihood: 'medium' },
    ],
    steps: [
      { order: 1, title: 'Inspect level when cool', detail: 'Compare against the cold-full mark after the engine has cooled.', tool: 'Coolant', time: '5 min' },
      { order: 2, title: 'Top up and monitor', detail: 'Add approved coolant. Recheck at the next stop; a drop points to a real leak.', time: '10 min' },
    ],
  },
  158: {
    name: 'Battery Voltage / Charging',
    system: 'Electrical / Charging',
    plain: 'Battery voltage is below (or above) the normal charging band, or the alternator is not keeping the batteries charged.',
    severity: 'yellow',
    keepDriving: 'Usually safe to finish to a stop, but load-shedding can strand you — get it checked soon.',
    causes: [
      { title: 'Alternator not charging', detail: 'Worn brushes, bad diode, or drive belt slipping.', likelihood: 'high' },
      { title: 'Battery condition', detail: 'A weak or failing battery that will not hold a charge.', likelihood: 'medium' },
      { title: 'Loose or corroded terminals', detail: 'Poor connection at the battery or ground strap.', likelihood: 'medium' },
    ],
    steps: [
      { order: 1, title: 'Check dash charging voltage', detail: 'With the engine running you should see roughly 13.5–14.5V. Below that the alternator is suspect.', time: '1 min' },
      { order: 2, title: 'Inspect battery terminals', detail: 'Clean and tighten corroded or loose terminals and the main ground.', tool: 'Wrench', time: '5 min' },
      { order: 3, title: 'Check the alternator belt', detail: 'Confirm it is tight and not glazed or cracked.', time: '3 min' },
      { order: 4, title: 'Plan for service', detail: 'If voltage stays low with a good belt, schedule alternator/battery service before it strands you.', time: '—' },
    ],
  },
  102: {
    name: 'Intake Manifold Pressure (Boost)',
    system: 'Air / Turbo',
    plain: 'Boost pressure is outside normal range — typically low, pointing to a charge-air, intake, or turbo issue.',
    severity: 'yellow',
    keepDriving: 'Usually safe to complete to a stop; expect reduced power. Watch for a redder condition if smoke or noise appears.',
    causes: [
      { title: 'Charge-air leak', detail: 'A split CAC boot or hose dumping boost.', likelihood: 'high' },
      { title: 'Clogged air filter', detail: 'Restriction starves the engine of air.', likelihood: 'medium' },
      { title: 'Turbo or actuator issue', detail: 'Worn turbo or a stuck wastegate/VGT not building boost.', likelihood: 'medium' },
    ],
    steps: [
      { order: 1, title: 'Listen for air leaks', detail: 'A hiss under load often means a charge-air hose or CAC leak.', time: '5 min' },
      { order: 2, title: 'Inspect charge-air boots', detail: 'Squeeze CAC hoses and look for oil-soaked splits or loose clamps.', tool: 'Flashlight', time: '10 min' },
      { order: 3, title: 'Check the air filter restriction', detail: 'Service or replace a restricted element.', tool: 'Air filter', time: '10 min' },
    ],
  },
  157: {
    name: 'Injection Control Pressure',
    system: 'Fuel / High-Pressure Injection',
    plain: 'High-pressure (HEUI/common-rail) injection pressure is not building to spec. The engine will run rough, derate, or not start.',
    severity: 'red',
    keepDriving: 'Do not force it. If the engine derates or runs rough, shut down and diagnose before driving.',
    causes: [
      { title: 'Fuel supply problem', detail: 'Empty/stale fuel, blocked filter, or air in the fuel system.', likelihood: 'high' },
      { title: 'High-pressure pump or injector fault', detail: 'Internal wear dropping injection pressure.', likelihood: 'medium' },
    ],
    steps: [
      { order: 1, title: 'Confirm fuel level and quality', detail: 'Check fuel level and that the fuel/water separator is not full of water.', time: '5 min' },
      { order: 2, title: 'Check/prime fuel filters', detail: 'Replace a restricted filter and re-prime the system.', tool: 'Filter wrench', time: '15 min' },
      { order: 3, title: 'Look for external fuel leaks', detail: 'Wet fuel lines or a leaking injector return can drop pressure.', time: '10 min' },
      { order: 4, title: 'If it persists, call it in', detail: 'Injection hardware faults need a shop with the right tools.', safety: true },
    ],
  },
  84: {
    name: 'Wheel-Based Vehicle Speed',
    system: 'Drivetrain / ABS',
    plain: 'The wheel speed signal is missing or erratic, often from an ABS or speed-sensor fault.',
    severity: 'yellow',
    keepDriving: 'Safe to drive with care; cruise/ABS may be limited. Treat as a service-needed condition.',
    causes: [
      { title: 'Wheel speed sensor', detail: 'A dirty, damaged, or mis-gapped sensor.', likelihood: 'high' },
      { title: 'Wiring / connector', detail: 'Chafed or corroded harness near the wheel.', likelihood: 'medium' },
    ],
    steps: [
      { order: 1, title: 'Inspect the affected sensor area', detail: 'Look for debris, damage, or a loose connector on the harness.', tool: 'Flashlight', time: '10 min' },
      { order: 2, title: 'Plan ABS service', detail: 'If it stays on, schedule the ABS/sensor service at your next stop.', time: '—' },
    ],
  },
  190: {
    name: 'Engine Speed (Governor)',
    system: 'Engine Controls',
    plain: 'The ECM sees an engine-speed signal outside normal expectations.',
    severity: 'yellow',
    keepDriving: 'Usually safe to complete to a stop; drive gently and monitor for smoke or noise.',
    causes: [
      { title: 'Sensor or wiring', detail: 'Erratic engine speed sensor signal.', likelihood: 'medium' },
      { title: 'Mechanical drive issue', detail: 'Something loading or binding the engine intermittently.', likelihood: 'low' },
    ],
    steps: [
      { order: 1, title: 'Monitor gauge behaviour', detail: 'Note if RPM jumps or hunts at idle or under load.', time: 'few min' },
      { order: 2, title: 'Get it checked at next service', detail: 'An engine-speed sensor fault is cheap to replace once confirmed.', time: '—' },
    ],
  },
  1761: {
    name: 'DEF Level / Aftertreatment',
    system: 'Emissions (DEF)',
    plain: 'Diesel exhaust fluid is low or the aftertreatment system needs attention. Left unchecked the truck will derate.',
    severity: 'yellow',
    keepDriving: 'Safe to drive, but DEF is time-limited before a derate — address it this trip.',
    causes: [
      { title: 'Low DEF', detail: 'DEF tank is low or empty.', likelihood: 'high' },
      { title: 'DEF quality / dosing', detail: 'Bad DEF or a dosing/quality-sensor fault.', likelihood: 'medium' },
    ],
    steps: [
      { order: 1, title: 'Check DEF level', detail: 'Top up with fresh, certified DEF at the next available pump.', time: '10 min' },
      { order: 2, title: 'Note the countdown', detail: 'Track the dash countdown to derate. Do not let it reach zero on the road.', safety: true },
    ],
  },
};

/** Recognize "SPN 110", "110", "spn100 fmi 1" etc. */
function parseCode(raw: string): { spn: number; fmi?: number } | null {
  const m = raw.toLowerCase().match(/(?:spn[\s:=]*)?(\d{1,4})(?:\s+fmi[\s:=]*(\d{1,2}))?/);
  if (!m) return null;
  const spn = parseInt(m[1], 10);
  if (spn < 1 || spn > 9999) return null;
  return { spn, fmi: m[2] ? parseInt(m[2], 10) : undefined };
}

function describeUnknown(raw: string): Step[] {
  return [
    { order: 1, title: 'Record the code exactly', detail: `Write down "${raw}" including any FMI number — a photo of the dash helps the shop.`, time: '1 min' },
    { order: 2, title: 'Do the safe baseline checks', detail: 'Confirm oil, coolant, and fuel levels and scan for leaks before assuming the worst.', time: '10 min' },
    { order: 3, title: 'Research the code', detail: 'Search the exact code text with your engine/ECU make to find known causes and TSBs.', tool: 'Web search' },
    { order: 4, title: 'Contact your OEM or a shop', detail: 'Share the code with the OEM hotline or your mechanic. They can pull the full SPN/FMI detail.', safety: true },
  ];
}

export function normalizeCodes(input: string): string[] {
  return input
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface DiagnoseInput {
  codes?: string[];
  symptom?: SymptomId;
  /** Free text from the driver. */
  description?: string;
}

export function diagnose({ codes = [], symptom, description }: DiagnoseInput): MechanicResult {
  const recognized: ResolvedCode[] = [];
  const unknown: string[] = [];

  for (const raw of codes) {
    const parsed = parseCode(raw);
    const entry = parsed ? SPN_LIBRARY[parsed.spn] : undefined;
    if (parsed && entry) {
      recognized.push({
        raw: raw.toUpperCase(),
        spn: parsed.spn,
        name: entry.name,
        system: entry.system,
        plain: parsed.fmi != null ? `${entry.plain} (FMI ${parsed.fmi})` : entry.plain,
        severity: entry.severity,
        keepDriving: entry.keepDriving,
      });
    } else {
      unknown.push(raw.toUpperCase());
    }
  }

  // Build the merged plan.
  const codesCauses = recognized.flatMap((c) => {
    const e = SPN_LIBRARY[c.spn];
    return e.causes.map((x) => ({ ...x, title: `${c.name}: ${x.title}` }));
  });

  const codesSteps: Step[] = [];
  for (const c of recognized) {
    for (const s of SPN_LIBRARY[c.spn].steps) {
      codesSteps.push({ ...s, order: 0 });
    }
  }
  let triage: Triage = 'green';
  for (const c of recognized) {
    if (c.severity === 'red') triage = 'red';
    else if (c.severity === 'yellow' && triage === 'green') triage = 'yellow';
  }

  const stopConditions: string[] = [];
  for (const c of recognized) {
    if (c.severity === 'red') stopConditions.push(`${c.name} — ${c.keepDriving}`);
  }
  if (triage === 'green' && unknown.length === 0 && symptom == null && !description) {
    triage = 'green';
  }

  const steps: Step[] = [...codesSteps].map((s, i) => ({ ...s, order: i + 1 }));
  if (unknown.length > 0) {
    for (const s of describeUnknown(unknown[0])) steps.push({ ...s, order: steps.length + 1 });
  }

  const causes = [...codesCauses];
  const searchQueries = codes.map((c) => `${c} fault code causes fix truck`).filter(Boolean);
  if (symptom) searchQueries.unshift(`${symptomLabel(symptom)} truck causes fix`);
  if (description?.trim()) searchQueries.unshift(`${description.trim()} heavy truck diagnosis fix`);

  return {
    triage,
    headline: headline(triage, recognized, symptom),
    summary: summaryOf(recognized, symptom, description),
    codes: recognized,
    unknown,
    causes: causes.slice(0, 6),
    steps: dedupeSteps(steps),
    stopConditions: dedupeStrings(stopConditions),
    searchQueries: dedupeStrings(searchQueries).slice(0, 3),
    note: 'This guidance is informational and based on common failure patterns. It is not a substitute for a certified technician or your OEM. When in doubt, shut down and get professional help.',
  };
}

function dedupeSteps(steps: Step[]): Step[] {
  const seen = new Set<string>();
  return steps.filter((s) => {
    const key = s.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.toLowerCase()))].map(
    (l) => arr.find((s) => s.toLowerCase() === l)!,
  );
}

function headline(
  triage: Triage,
  codes: ResolvedCode[],
  symptom?: SymptomId,
): string {
  const primary = codes.find((c) => c.severity === 'red') ?? codes[0];
  const subject = primary?.name ?? (symptom ? symptomLabel(symptom) : 'your truck');
  if (triage === 'red') return `Stop-and-fix: ${subject}`;
  if (triage === 'yellow') return `Drive with care: ${subject}`;
  if (codes.length) return `Monitor: ${subject}`;
  if (symptom) return `Let's sort out: ${symptomLabel(symptom)}`;
  return 'Assessment ready';
}

function summaryOf(codes: ResolvedCode[], symptom?: SymptomId, description?: string): string {
  const parts: string[] = [];
  if (codes.length) parts.push(`${codes.length} fault code(s) decoded from the ECM.`);
  if (symptom) parts.push(`Symptom reported: ${symptomLabel(symptom)}.`);
  if (description?.trim()) parts.push(`You described: "${description.trim()}".`);
  if (codes.length === 0 && !symptom) parts.push('No specific code or symptom entered yet — review the checks below.');
  return parts.join(' ');
}

export function symptomLabel(id: SymptomId): string {
  return SYMPTOMS.find((s) => s.id === id)?.label ?? id;
}

export const SYMPTOMS: { id: SymptomId; label: string; hint: string }[] = [
  { id: 'no_start', label: "Won't start / cranks slow", hint: 'Fuel, batteries, or starter' },
  { id: 'overheating', label: 'Overheating', hint: 'Coolant, fan, belts' },
  { id: 'low_oil_pressure', label: 'Low oil pressure warning', hint: 'Stop and check oil' },
  { id: 'air_pressure_brakes', label: 'Air pressure / brake warning', hint: 'Stop — air is safety-critical' },
  { id: 'loss_of_power', label: 'Loss of power / black smoke', hint: 'Air, fuel, or turbo' },
  { id: 'battery_electrical', label: 'Battery / charging / dim lights', hint: 'Alternator or batteries' },
  { id: 'check_engine_derate', label: 'Check engine light / derate', hint: 'ECM fault present' },
  { id: 'vibration', label: 'Vibration / wobble', hint: 'Wheels, tires, driveline' },
  { id: 'air_leak', label: 'Air / hissing leak', hint: 'Air system or bags' },
];

const SYMPTOM_STEPS: Record<SymptomId, Step[]> = {
  no_start: [
    { order: 1, title: 'Check batteries & voltage', detail: 'Try the starter with lights on — if they dim hard, batteries or connections are weak.', tool: 'Multimeter', time: '5 min' },
    { order: 2, title: 'Check fuel level and primer', detail: 'Confirm fuel, then cycle the key/prime. Air in fuel blocks a start on many engines.', time: '10 min' },
    { order: 3, title: 'Check starter & grounds', detail: 'A clicking starter or hot solenoid points to cables/grounds or the starter.', tool: 'Wrench', time: '10 min' },
  ],
  overheating: SPN_LIBRARY[110].steps.map((s) => ({ ...s, order: 0 })),
  low_oil_pressure: SPN_LIBRARY[100].steps.map((s) => ({ ...s, order: 0 })),
  air_pressure_brakes: [
    { order: 1, title: 'Park and set the brake', detail: 'Do not drive with a low-air warning. Chock wheels if needed.', safety: true },
    { order: 2, title: 'Find the air leak', detail: 'Idle to build air, then listen. A hiss at a gladhand, bag, or valve is common.', tool: 'Soapy water', time: '10 min' },
    { order: 3, title: 'Watch for compressor/pump fault', detail: 'If air will not build at all, the air compressor drive or governor is suspect.', safety: true },
  ],
  loss_of_power: [
    { order: 1, title: 'Check air filter restriction', detail: 'A clogged filter kills power under load.', tool: 'Air filter', time: '10 min' },
    { order: 2, title: 'Listen for charge-air leaks', detail: 'Squeeze CAC boots for oil-soaked splits that dump boost.', tool: 'Flashlight', time: '10 min' },
    { order: 3, title: 'Check fuel supply', detail: 'Restricted filter or low fuel pressure causes power loss and smoke.', time: '10 min' },
  ],
  battery_electrical: SPN_LIBRARY[158].steps.map((s) => ({ ...s, order: 0 })),
  check_engine_derate: [
    { order: 1, title: 'Pull the active fault', detail: 'Read the code from the dash or app so you are not guessing.', time: '5 min' },
    { order: 2, title: 'Watch DEF / emissions countdown', detail: 'A derate is often emissions-related; know your countdown.', safety: true },
    { order: 3, title: 'Do a safe baseline', detail: 'Check oil, coolant, fuel, and air before deeper diagnosis.', time: '10 min' },
  ],
  vibration: [
    { order: 1, title: 'Check tire pressure and wear', detail: 'Inspect for bulges, cupping, or a missing wheel weight.', tool: 'Gauge', time: '10 min' },
    { order: 2, title: 'Inspect wheels and lugs', detail: 'Check lug torque and wheel condition on the affected position.', tool: 'Torque wrench', time: '15 min' },
    { order: 3, title: 'Look at the driveline', detail: 'A u-joint or carrier bearing can vibrate under load.', time: '10 min' },
  ],
  air_leak: [
    { order: 1, title: 'Build air and park', detail: 'Shut down, set brakes, chock. Find the leak with the truck still.', safety: true, time: '5 min' },
    { order: 2, title: 'Locate with soapy water', detail: 'Bubble test gladhands, bags, and valves to pinpoint the hiss.', tool: 'Soapy water', time: '10 min' },
    { order: 3, title: 'Address or flag it', detail: 'Minor leaks can wait to a stop; a fast drop means do not drive.', safety: true },
  ],
};

export function triageRank(t: Triage): number {
  return t === 'red' ? 0 : t === 'yellow' ? 1 : 2;
}

export function symptomSteps(id: SymptomId): Step[] {
  return SYMPTOM_STEPS[id] ?? [];
}
