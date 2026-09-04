/**
 * Pro-tier AI usage ledger for the Roadside Mechanic.
 *
 * The Pro plan is $30/mo. We budget a fixed slice of that to AI usage and price
 * each deep-dive as a credit, so a single heavy month cannot blow the margin.
 *
 * IMPORTANT (honesty): the two money constants are conservative placeholders to
 * be tuned against real provider pricing once a provider is wired. They are
 * NOT measured against a live LLM bill yet.
 */

export const PRO_PRICE_USD = 30;
/** Slice of the $30 retained for AI — kept deliberately conservative. */
export const AI_MONTHLY_BUDGET_USD = 3;
/** Estimated per-deep-dive cost cap in USD. */
export const AI_PER_ANALYSIS_USD = 0.3;

export const ANALYSES_PER_MONTH = Math.floor(AI_MONTHLY_BUDGET_USD / AI_PER_ANALYSIS_USD);

export type Plan = 'basic' | 'pro' | 'fleet';

/** Mock auth seam — returns the signed-in customer's plan. Swap for real auth. */
export function currentPlan(): Plan {
  return 'pro';
}

interface Ledger {
  remaining: number;
  resetAt: number;
  used: number;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** In-memory ledger, keyed by customer. Resets on process restart — a real
 *  billing service would persist this server-side. */
class CreditLedger {
  private store = new Map<Plan, Ledger>();

  private entry(plan: Plan): Ledger {
    let e = this.store.get(plan);
    const now = Date.now();
    if (!e || now > e.resetAt) {
      e = { remaining: ANALYSES_PER_MONTH, resetAt: now + MONTH_MS, used: 0 };
      this.store.set(plan, e);
    }
    return e;
  }

  remaining(plan: Plan): number {
    return this.entry(plan).remaining;
  }

  used(plan: Plan): number {
    return this.entry(plan).used;
  }

  debit(plan: Plan): boolean {
    const e = this.entry(plan);
    if (e.remaining <= 0) return false;
    e.remaining -= 1;
    e.used += 1;
    return true;
  }
}

export const ledger = new CreditLedger();

export interface BudgetStatus {
  plan: Plan;
  allowance: number;
  remaining: number;
  used: number;
  perAnalysisUsd: number;
  budgetUsd: number;
}

export function budgetStatus(): BudgetStatus {
  const plan = currentPlan();
  return {
    plan,
    allowance: ANALYSES_PER_MONTH,
    remaining: ledger.remaining(plan),
    used: ledger.used(plan),
    perAnalysisUsd: AI_PER_ANALYSIS_USD,
    budgetUsd: AI_MONTHLY_BUDGET_USD,
  };
}
