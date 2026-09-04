import type { VehicleDetail } from './domain';

/**
 * Predictive maintenance — RULE-BASED heuristic over OBD history + intervals.
 *
 * Honest label: this is not machine learning. It computes trend deltas and
 * interval proximity against fixed thresholds. A real ML/forecasting model
 * plugs in behind the same shape later. We never present it as a model output.
 */

export interface RiskSignal {
  id: string;
  label: string;
  detail: string;
  severity: 'watch' | 'high';
  /** What the driver should do. */
  action: string;
}

function trend(values: number[]): { delta: number; rising: boolean } {
  if (values.length < 2) return { delta: 0, rising: false };
  const first = values[0];
  const last = values[values.length - 1];
  return { delta: last - first, rising: last > first };
}

export function predictMaintenance(v: VehicleDetail): RiskSignal[] {
  const risks: RiskSignal[] = [];

  const milesToService = v.nextServiceMi - v.odometerMi;
  if (milesToService <= 0) {
    risks.push({
      id: 'overdue',
      label: 'Service is overdue',
      detail: `Odometer past the ${v.nextServiceMi.toLocaleString()} mi service mark by ${Math.abs(milesToService).toLocaleString()} mi.`,
      severity: 'high',
      action: 'Book oil & filter service before the next long leg.',
    });
  } else if (milesToService <= 800) {
    risks.push({
      id: 'due_soon',
      label: 'Service due soon',
      detail: `Next service in ~${milesToService.toLocaleString()} mi.`,
      severity: 'watch',
      action: 'Plan a stop for the scheduled service.',
    });
  }

  const volts = v.samples.map((s) => s.batteryVoltage);
  const vt = trend(volts);
  if (vt.rising === false && vt.delta <= -0.9) {
    risks.push({
      id: 'charging',
      label: 'Charging trend falling',
      detail: `Battery voltage has drifted down ~${Math.abs(vt.delta).toFixed(1)}V over recent samples (${volts[0]}→${volts[volts.length - 1]}V).`,
      severity: 'watch',
      action: 'Have the alternator and batteries load-tested this week.',
    });
  }
  if (volts[volts.length - 1] < 12.4) {
    risks.push({
      id: 'low_batt',
      label: 'Battery voltage low',
      detail: `Latest idle reading ${volts[volts.length - 1]}V is below the healthy floor.`,
      severity: 'high',
      action: 'Check alternator charge and battery health before a cold start.',
    });
  }

  const coolant = v.samples.map((s) => s.coolantTempF);
  const ct = trend(coolant);
  if (ct.rising && coolant[coolant.length - 1] > 200) {
    risks.push({
      id: 'cooling',
      label: 'Coolant temperature creeping up',
      detail: `Coolant trended ${coolant[0]}→${coolant[coolant.length - 1]}°F. Not yet overheating, but climbing.`,
      severity: 'watch',
      action: 'Inspect coolant level and fan next stop; see the Roadside Mechanic.',
    });
  }

  const activeFaults = v.faultHistory.filter((f) => !f.cleared);
  if (activeFaults.length > 0) {
    risks.push({
      id: 'faults',
      label: `${activeFaults.length} active fault(s)`,
      detail: activeFaults.map((f) => `${f.code} ${f.label}`).join(' · '),
      severity: 'high',
      action: 'Decode now in the Roadside Mechanic and address before dispatch.',
    });
  }

  return risks;
}
