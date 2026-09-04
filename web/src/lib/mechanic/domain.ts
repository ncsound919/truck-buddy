/**
 * Roadside Mechanic — domain model for the breakdown/diagnostics assistant.
 *
 * The engine is pure and deterministic: it decodes SAE J1939 SPN fault codes
 * and/or driver symptoms into a triaged, step-by-step diagnosis. A separate
 * "search seam" supplies research references (see search.ts).
 */

export type Triage = 'red' | 'yellow' | 'green';

export interface ResolvedCode {
  raw: string;
  spn: number;
  name: string;
  system: string;
  /** Plain-language reading of the fault. */
  plain: string;
  severity: Triage;
  /** Can the driver safely continue to a shop vs must stop now. */
  keepDriving: string;
}

export interface Cause {
  title: string;
  detail: string;
  likelihood: 'high' | 'medium' | 'low';
}

export interface Step {
  order: number;
  title: string;
  detail: string;
  tool?: string;
  time?: string;
  safety?: boolean;
}

export interface MechanicResult {
  triage: Triage;
  headline: string;
  summary: string;
  codes: ResolvedCode[];
  unknown: string[];
  causes: Cause[];
  steps: Step[];
  /** Absolute safety boundaries — never advise past these. */
  stopConditions: string[];
  /** Ready-to-run research queries (wired to the search seam later). */
  searchQueries: string[];
  note: string;
}

export type SymptomId =
  | 'no_start'
  | 'overheating'
  | 'low_oil_pressure'
  | 'air_pressure_brakes'
  | 'loss_of_power'
  | 'battery_electrical'
  | 'check_engine_derate'
  | 'vibration'
  | 'air_leak';
