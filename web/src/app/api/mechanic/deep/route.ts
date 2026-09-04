import { NextResponse } from 'next/server';

import { diagnose, type DiagnoseInput } from '@/lib/mechanic/engine';
import { getAiSeam } from '@/lib/mechanic/ai';
import {
  budgetStatus,
  currentPlan,
  ledger,
} from '@/lib/mechanic/budget';

/**
 * POST /api/mechanic/deep
 * Runs the Pro-tier AI deep-dive on a Roadside Mechanic diagnosis.
 * Server-enforced: plan must be 'pro'/'fleet' and the monthly credit must not
 * be exhausted. Debits a credit only on success.
 */
export async function POST(req: Request) {
  const plan = currentPlan();
  if (plan === 'basic') {
    return NextResponse.json({ error: 'plan_required' }, { status: 402 });
  }

  let input: DiagnoseInput;
  try {
    const body = (await req.json()) as DiagnoseInput;
    input = {
      codes: Array.isArray(body.codes) ? body.codes : [],
      symptom: body.symptom,
      description: typeof body.description === 'string' ? body.description : undefined,
    };
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const result = diagnose(input);

  if (ledger.remaining(plan) <= 0) {
    return NextResponse.json(
      { error: 'budget_exhausted', status: budgetStatus() },
      { status: 429 },
    );
  }

  try {
    const seam = getAiSeam();
    const insight = await seam.deepAnalyze(result);
    ledger.debit(plan);
    return NextResponse.json({ insight, status: budgetStatus() });
  } catch {
    return NextResponse.json(
      { error: 'ai_unavailable', message: 'AI provider is not configured.' },
      { status: 503 },
    );
  }
}
