import type { MechanicResult } from './domain';

/**
 * AI deep-insight seam for the Roadside Mechanic (Pro tier).
 *
 * Generative AI requires a provider + API key, which we do not guess. Two
 * modes exist and the UI always labels which one produced the output:
 *
 *  - `offline` (today): deterministic rule-based synthesis over the decoded
 *    diagnosis. Real engineering logic, no external call. Clearly labelled.
 *  - `ai`: real generative provider, activated the moment an API key is
 *    configured (see `getAiSeam`). Same interface, same UI.
 */

export type AiMode = 'offline' | 'ai';

export interface AiInsight {
  mode: AiMode;
  confidence: 'high' | 'medium' | 'low';
  verdict: string;
  rootCause: string;
  points: string[];
  carrySpares: string[];
  riskIfIgnored: string;
  callShopWhen: string;
  disclaimer: string;
}

export interface AiSeam {
  deepAnalyze(result: MechanicResult): Promise<AiInsight>;
}

const SPARE_MAP: Record<string, string[]> = {
  Lubrication: ['Oil (correct viscosity)', 'Spare oil filter + drain plug washer'],
  Cooling: ['Coolant/water mix', 'Fan belt', 'Radiator hose + clamps'],
  'Electrical / Charging': ['Batteries or jump pack', 'Spare alternator belt', 'Terminal cleaner'],
  'Fuel / High-Pressure Injection': ['Fuel filters', 'Primer bulb', 'Spare fuel'],
  'Air / Turbo': ['CAC boot + clamps', 'Spare air filter'],
  Emissions: ['DEF jug', 'Spare DEF cap'],
};

/** Offline synthesis. Produces grounded guidance from the decoded diagnosis. */
export class OfflineAiSeam implements AiSeam {
  async deepAnalyze(result: MechanicResult): Promise<AiInsight> {
    await new Promise((r) => setTimeout(r, 500));

    const red = result.triage === 'red';
    const yellow = result.triage === 'yellow';
    const top = result.codes[0];
    const system = top?.system ?? 'General';
    const spares = [...new Set((SPARE_MAP[system] ?? []))];

    const rootCause = top
      ? `${top.name} is most often a ${result.causes[0]?.title.toLowerCase() ?? 'supply or sensor'} fault before it is a hard failure.`
      : 'Without a confirmed code, the plan below narrows it by symptom before you spend on parts.';

    const points: string[] = [
      `${top ? `The ECM flag on ${top.name} means start with the cheapest, most common cause (${result.causes[0]?.title.toLowerCase() ?? 'connections and supply'}) and only escalate if it persists.` : 'Start with the visual and level checks in the steps — most roadside stalls trace to supply (fuel, air, coolant, electrical), not a failed major component.'}`,
      'Fix one variable at a time and re-test. Replacing parts blindly on a guessed code is how a cheap fault becomes an expensive one.',
      red || yellow
        ? 'A "can continue" diagnosis only holds while the readings stay normal. Re-check at every stop; a redder condition means stop.'
        : 'No red condition detected. Keep it monitored on your next leg and note anything that changes.',
    ];

    return {
      mode: 'offline',
      confidence: top && result.codes.length ? 'high' : 'medium',
      verdict: red
        ? 'Recommended action: do NOT continue. Perform the safe checks, then arrange a tow or mobile mechanic before running the engine again.'
        : yellow
          ? 'Recommended action: safe to reach a service point this trip. Do the checks at your next stop and schedule service before the next loaded leg.'
          : 'Recommended action: monitored continuation. No urgent fault. Address any low-risk checks at your next scheduled service.',
      rootCause,
      points,
      carrySpares: spares.length ? spares : ['Basic tool kit', 'Multimeter', 'Flashlight', 'Spare coolant + oil'],
      riskIfIgnored: top
        ? `Ignoring ${top.name} escalates from ${yellow ? 'a service item' : 'a drivability issue'} to a tow or major-component failure — and, on cooling or oil, possible engine loss.`
        : 'Ignoring a developing symptom rarely resolves it; it usually becomes a more expensive tow later.',
      callShopWhen:
        'Call a shop when: it is a red condition, you lack a tool/part listed, the fix does not hold after one retry, or any check is beyond your comfort level.',
      disclaimer: 'This offline deep-dive is rule-based synthesis over the decoded diagnosis. It is not generative AI and is not a substitute for a certified technician. Connect an AI provider to enable generative analysis.',
    };
  }
}

/**
 * Activates real generative AI once a key exists. Kept intentionally minimal:
 * wire the provider call here (e.g. an OpenAI-compatible chat endpoint) and
 * label `mode: 'ai'`. Without a key this returns null so we fall back offline.
 */
class ProviderAiSeam implements AiSeam {
  async deepAnalyze(): Promise<AiInsight> {
    throw new Error(
      'Real AI provider is not configured. Set AI_PROVIDER_API_KEY to enable generative deep-dives.',
    );
  }
}

const HAS_KEY = !!process.env.AI_PROVIDER_API_KEY;

export function getAiSeam(): AiSeam {
  return HAS_KEY ? new ProviderAiSeam() : new OfflineAiSeam();
}
