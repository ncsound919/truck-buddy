import type { VettingKind, VettingResult, VettingStatus } from './domain';

/**
 * FMCSA carrier/broker vetting seam.
 *
 * Real path (keyless): query the FMCSA registration snapshot / li-public data
 * by DOT number to confirm AUTHORIZED/ACTIVE authority and active insurance
 * before a driver accepts freight. A clean per-query JSON API (SAFER QCMobile)
 * can require a registered webKey, so the design favours the keyless snapshot
 * route with a manual DOT lookup fallback.
 *
 * Today this runs an offline registry over known demo payers and labels the
 * source honestly. Swap `getVettingSeam()` for a live implementation when a
 * snapshot/webKey is available — the UI and accept guard never change.
 */
export interface VettingSeam {
  check(query: string, kind: VettingKind): Promise<VettingResult>;
}

type Row = {
  dot: string;
  authorityActive: boolean;
  insuranceActive: boolean;
};

const REGISTRY: Record<string, Row> = {
  'ACME Distribution Center': { dot: '3149271', authorityActive: true, insuranceActive: true },
  'Raleigh Freight Co.': { dot: '2088114', authorityActive: true, insuranceActive: true },
  'Haley Logistics': { dot: '1900452', authorityActive: true, insuranceActive: false },
  'Piedmont Cold': { dot: '2877305', authorityActive: false, insuranceActive: true },
  'Peach Steel': { dot: '1762293', authorityActive: true, insuranceActive: true },
  'Midlands Produce': { dot: '2551400', authorityActive: true, insuranceActive: true },
  'Harbor Cold': { dot: '2987110', authorityActive: true, insuranceActive: true },
  'Port Logistics': { dot: '2448903', authorityActive: false, insuranceActive: false },
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class OfflineVettingSeam implements VettingSeam {
  async check(query: string, kind: VettingKind): Promise<VettingResult> {
    await delay(220);
    const row = REGISTRY[query];
    if (!row) {
      return {
        query,
        kind,
        status: 'unverified',
        reasons: ['No matching record in the offline registry. Live FMCSA lookup required before trusting this payer.'],
        sourceLabel: 'offline registry (demo)',
      };
    }
    const reasons: string[] = [];
    if (!row.authorityActive) reasons.push('Authority is NOT active (inactive/revoked).');
    if (!row.insuranceActive) reasons.push('No active required insurance on file.');
    if (row.authorityActive && row.insuranceActive) {
      reasons.push('Authority active and insurance on file.');
    }
    const status: VettingStatus =
      row.authorityActive && row.insuranceActive ? 'verified' : 'warning';
    return {
      query,
      kind,
      dotNumber: row.dot,
      authorityActive: row.authorityActive,
      insuranceActive: row.insuranceActive,
      status,
      reasons,
      sourceLabel: 'offline registry (demo) — replace with FMCSA snapshot',
    };
  }
}

export const vettingSeam: VettingSeam = new OfflineVettingSeam();

const TONE: Record<VettingStatus, string> = {
  verified: 'text-success',
  warning: 'text-warning',
  unverified: 'text-warning',
};

const LABEL: Record<VettingStatus, string> = {
  verified: 'Verified payer',
  warning: 'Check before accepting',
  unverified: 'Unverified payer',
};

export function vettingTone(s: VettingStatus): string {
  return TONE[s];
}

export function vettingLabel(s: VettingStatus): string {
  return LABEL[s];
}
