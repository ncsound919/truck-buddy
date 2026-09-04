/**
 * Real, genuinely-free load boards a driver can search & book on without a
 * subscription. These are external products we deep-link to (free, no keys, no
 * scraping). The load-board aggregation pattern in mock-api is a demonstration
 * of the *feed shape*; live programmatic ingestion per board needs that board's
 * carrier/API credentials and is wired through a separate ingest seam later.
 *
 * Sources: TruckSmarter, Trucker Path, Trulos, C.H. Robinson, Direct Freight,
 * J.B. Hunt, DAT free tier. Convoy is intentionally omitted — its load board
 * shut down in late 2023.
 */
export interface ExternalBoard {
  id: string;
  name: string;
  url: string;
  cost: string;
  blurb: string;
  bestFor: string;
  /** External link opens the provider's own live board (login may be needed). */
  needsLogin: boolean;
}

export const EXTERNAL_BOARDS: ExternalBoard[] = [
  {
    id: 'trucksmarter',
    name: 'TruckSmarter',
    url: 'https://www.trucksmarter.com/free-load-boards',
    cost: 'Free',
    blurb: 'Aggregates loads from multiple sources into one free search; built-in rate and dispatch tools.',
    bestFor: 'All-in-one free searching without paying for a board.',
    needsLogin: true,
  },
  {
    id: 'truckerpath',
    name: 'Trucker Path · TruckLoads',
    url: 'https://truckerpath.com/truckloads/free-load-board',
    cost: 'Free',
    blurb: '150,000+ daily loads, AI-enhanced search, document scanning and invoicing.',
    bestFor: 'Drivers who want volume plus paperwork tools.',
    needsLogin: true,
  },
  {
    id: 'trulos',
    name: 'Trulos',
    url: 'https://www.trulos.com/',
    cost: 'Free',
    blurb: '85,000+ loads weekly; search without an account. Bundles free dispatch TMS, IFTA and rate tools.',
    bestFor: 'No-account browsing and bundled free truck tools.',
    needsLogin: false,
  },
  {
    id: 'chrobinson',
    name: 'C.H. Robinson',
    url: 'https://www.chrobinson.com/en-us/carriers/loadboard/',
    cost: 'Free',
    blurb: 'Largest free board in North America with instant booking. Login unlocks rates and filters.',
    bestFor: 'Instant booking at scale.',
    needsLogin: true,
  },
  {
    id: 'directfreight',
    name: 'Direct Freight',
    url: 'https://www.directfreight.com/home/',
    cost: 'Free',
    blurb: '300K+ loads daily from brokers and shippers, searchable in a driver app.',
    bestFor: 'High daily load volume.',
    needsLogin: true,
  },
  {
    id: 'jbhunt',
    name: 'J.B. Hunt',
    url: 'https://www.jbhunt.com/loadboard/load-board/map',
    cost: 'Free',
    blurb: 'Thousands of J.B. Hunt loads, searchable on a map.',
    bestFor: 'J.B. Hunt freight by lane on a map.',
    needsLogin: false,
  },
  {
    id: 'dat',
    name: 'DAT (free tier)',
    url: 'https://www.dat.com/free-load-board',
    cost: 'Free tier',
    blurb: 'Free searches near your location; full depth, mileage and rate history need a paid sub.',
    bestFor: 'Local spot-market searching, then upgrade for market data.',
    needsLogin: true,
  },
];
