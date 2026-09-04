import type { MechanicResult } from './domain';

/**
 * Research seam for the Roadside Mechanic.
 *
 * A live web search needs a provider + API key (Tavily / Brave / SerpAPI…),
 * which we do not guess. Until one is wired, `research()` returns ready-to-run
 * search queries plus a clearly-labelled offline knowledge note. Swap the mock
 * for a real provider here — the UI never changes.
 */

export interface ResearchRef {
  kind: 'query' | 'note';
  text: string;
}

export interface WebSearchSeam {
  research(result: MechanicResult): Promise<ResearchRef[]>;
}

export class OfflineResearchSeam implements WebSearchSeam {
  async research(result: MechanicResult): Promise<ResearchRef[]> {
    await new Promise((r) => setTimeout(r, 200));
    const refs: ResearchRef[] = [];
    for (const q of result.searchQueries) {
      refs.push({ kind: 'query', text: q });
    }
    if (refs.length === 0) {
      refs.push({
        kind: 'query',
        text: 'heavy truck fault code causes and fix guide',
      });
    }
    refs.push({
      kind: 'note',
      text: 'Offline knowledge mode: run these searches in your browser, or connect a search provider to enable in-app research.',
    });
    return refs;
  }
}

export const researchSeam: WebSearchSeam = new OfflineResearchSeam();
