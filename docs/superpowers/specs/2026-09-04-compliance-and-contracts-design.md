# Design — Compliance aid + Contract automation (web portal)

Date: 2026-09-04
Status: APPROVED (operator) — two portal modules, owner-operator gated, mock seams labeled.

## 1. Goal

Give owner-operators (independent role, own authority) two connected capabilities in the
`web/` Next.js portal:

1. **My-compliance dashboard** (`/portal/compliance`) — an honest view of the credentials,
   filings, and programs *they* must keep current (authority, COI, IFTA, UCR, Form 2290,
   BOC-3, drug & alcohol, ELD, annual inspection) with days-to-due and what to do next.
2. **Contracts** (`/portal/contracts`) — a lead-to-contract funnel: vet prospective
   shippers/brokers → auto-assemble and send the carrier packet → turn a rate confirmation
   into a signed contract.

Context: the repo already has an FMCSA vetting seam (`lib/vetting.ts`), profile-perspective
gating (`lib/perspective.ts`, `canFactor`), a shared in-memory data seam
(`lib/mock-api.ts` `MockPortalApi` + `DataSeam`), and per-page client components. This
design reuses all of it. No real FMCSA lookups, email transport, filings, or insurance
APIs — every external action is a labeled seam, consistent with AGENTS.md "honest seams."

## 2. Scope

In:
- Two new portal pages + nav entries + icons.
- New domain types and DataSeam methods with deterministic fixtures.
- Packet assembly that reads the compliance dossier (missing docs flagged, not faked).
- Real state mutations for the demo: send packet, sign contract (shared mock store via
  route handlers), matching how `acceptLoad` works.
- Pure logic unit tests.

Out (seams only, no wires):
- Real FMCSA/SAFER lookups, real tax filing/renewal/submission, real email delivery of
  packets, insurance provider APIs, ELD partner. Filing/upload/send affordances are labeled
  demo or route to a documented future seam.

## 3. Profile gating

New helper in `lib/perspective.ts`: `runsOwnAuthority(profile)` =
`role === 'independent' && authority === 'own'` (semantically what `canFactor` means;
add a named alias so future callers read clearly).

Behavior per profile:
- Eligible (owner-op): full modules.
- Leased / company driver: honest empty state — "Your employer/carrier holds your
  authority, filings, and contracting" — same adaptation the money page does for factoring.
  No fabricated dashboard.

## 4. Compliance module (`/portal/compliance`)

### Types (added to `lib/domain.ts`)

```ts
type ComplianceCategory = 'credential' | 'filing' | 'program';
type ComplianceStatus  = 'active' | 'due_soon' | 'overdue' | 'info_needed';

interface ComplianceItem {
  id: string;               // e.g. 'authority', 'coc'
  category: ComplianceCategory;
  title: string;            // 'Operating authority (MC/DOT)'
  issuer: string;           // 'FMCSA' | 'IRS' | 'NC DMV' | 'Consortium' ...
  frequency: string;        // 'Renews every 2 years via biennial update'
  dueDate?: string;         // ISO; absent for status-only items
  status: ComplianceStatus; // derived by lib/compliance.ts, never hardcoded
  daysUntilDue?: number;    // derived
  docOnFile: boolean;
  nextAction: string;       // 'Upload renewed COI', 'File quarterly IFTA return' ...
}

interface ComplianceDossier {
  asOf: string;            // ISO now
  verdict: 'legal' | 'attention' | 'at_risk';
  items: ComplianceItem[];
  /** Actual files on hand — the sources a carrier packet draws from. */
  docsOnFile: DocOnFile[];
}

/** A stored file the driver holds (COI, authority letter, W9, rate agreement …). */
interface DocOnFile {
  key: PacketItemKey | 'boc3';   // reused by packet assembly — see §5
  label: string;                 // 'Certificate of insurance (COI)'
  issuer: string;
  expires?: string;              // ISO, when the underlying credential expires
}
```

### Seed set (owner-op anchor: Terrence Brooks, MC-482119, NC)

| id | title | issuer | cadence / note |
|---|---|---|---|
| authority | Operating authority (MC/DOT) | FMCSA | Biennial update ~ every 24 months |
| coc | Auto liability certificate (COI) | Insurer | due in ~14 days (drives `due_soon`) |
| ifta | IFTA quarterly fuel tax | NC DMV / FMCSA | next quarterly return in ~57 days |
| ucr | Unified Carrier Registration | UCR (state) | renews ~ annually, in ~45 days |
| h2290 | HVUT Form 2290 | IRS | paid current year; next ~350 days |
| boc3 | BOC-3 process agent | FMCSA | standing; doc on file |
| da | Drug & alcohol consortium | Consortium | enrollment active but proof **not on file** → `info_needed` |
| eld | ELD / HOS provider | FMCSA | active |
| dot_insp | Annual DOT inspection | FMCSA/state | due in ~8 days (second `due_soon`) |

Date handling: `dueDate` is computed **relative to `Date.now()`** at read time
(`lib/compliance.ts` helper `daysFromNow(n)`), so the demo always reads live. Status is
always derived from due date by one pure function — never stored.

### Verdict rules (pure, unit-tested)

- any `overdue` → `at_risk`
- else any `due_soon` (`daysUntilDue <= 30`) → `attention`
- else `legal`

Per-item: `daysUntilDue <= 0` → `overdue`; `<= 30` → `due_soon`; `docOnFile === false` for
a status-only/standing item that needs proof → `info_needed`; otherwise `active`.

### Page structure (server component off `portalApi.getCompliance()`)

- `PageTitle` "Compliance" / "What you must keep current to run legal."
- Overall banner (verdict): legal → success, attention → warning, at_risk → danger. Copy
  states exactly what is wrong (e.g. "COI expires in 14 days").
- Grouped item list by category (`credentials`, `filings`, `programs`), each row: title,
  issuer, cadence, status badge, days-to-due, `nextAction`, and a "on file"/"missing proof"
  chip when relevant.
- "Docs on file" shelf: renders `dossier.docsOnFile` (COI, MC authority letter, W9, blank
  rate agreement) — the stored files a carrier packet draws from.
- Honest footer note: "Reminders only — Truck Buddy does not file or pay anything."

## 5. Contracts module (`/portal/contracts`)

### Types (added to `lib/domain.ts`)

```ts
type LeadKind = 'broker' | 'shipper';
type LeadStage = 'new' | 'vetting' | 'packet_sent' | 'negotiating' | 'signed' | 'closed';

interface ContractLead {
  id: string;
  company: string;
  kind: LeadKind;
  dot?: string;
  contact?: string;
  source: string;               // 'Direct outreach' | 'Load board' | 'Referral'
  stage: LeadStage;
  createdAt: string;            // ISO
  lastActivityAt: string;       // ISO
  packetSentAt?: string;        // ISO, set by sendPacket
  vet: VettingResult;           // from vettingSeam — never fabricated
}

type PacketItemKey = 'coc' | 'authority' | 'w9' | 'rate_agreement' | 'additional_insured';
interface PacketItem {
  key: PacketItemKey;
  label: string;               // 'Certificate of insurance (COI)'
  onFile: boolean;             // from the dossier or a lead-specific requirement
  fromDossier?: boolean;       // true when sourced from the compliance docs-on-file shelf
}
interface PacketDraft {
  leadId: string;
  items: PacketItem[];
  complete: boolean;           // every required item onFile
  missing: PacketItemKey[];    // drives the "go handle this in Compliance" CTA
}

type ContractStatus = 'confirmed' | 'sent' | 'signed';
interface RateContract {
  id: string;
  ref: string;                 // 'RC-…'
  leadId: string;
  carrier: string;             // your MC
  lane: { origin: string; destination: string; milesMi: number };
  rateUsd: number;
  ratePerMileUsd: number;
  pickupAt: string;
  deliverBy: string;
  terms: { fuel: string; detention: string; layover: string; accessorial: string; payTerms: string };
  status: ContractStatus;
  createdAt: string;
  signedAt?: string;
}
```

### Seeded funnel (deterministic, uses existing vetting fixture names only)

Fixture-verified counterparties: ACME Distribution Center, Raleigh Freight Co., Peach
Steel, Midlands Produce. Fixture-flagged: Haley Logistics (authority active, **no active
insurance**), Piedmont Cold (authority inactive), Port Logistics (neither active).

1. **Leads** — `Midlands Produce` (shipper, verified, stage `new`), `ACME Distribution
   Center` (shipper, verified, stage `new`), `Peach Steel` (verified, stage
   `negotiating`), `Haley Logistics` (broker, warning — no active insurance — stage
   `vetting`, flagged "verify insurance before you work with them"), `Port Logistics`
   (both inactive → shown discouraged), and `Raleigh Freight Co.` (verified, stage
   `signed`).
2. **Carrier packet** — the composer lists the two `new` leads; default selection is
   `Midlands Produce`. It requires the standard files (COI, authority, W9, rate agreement
   — all on the dossier shelf) **plus an `additional_insured` COI endorsement naming the
   counterparty**, which is not yet on file → packet incomplete, and the visible
   cross-module callout: "Get an updated COI naming Midlands Produce as additional
   insured" → deep-links to `/portal/compliance` (which shows the COI expiring in 14
   days). This is the single deterministic example of a missing doc. `ACME Distribution
   Center` has a **complete** packet and is the lead the "Send packet" action works on
   (→ `packet_sent`).
3. **Rate confirm** — for `Peach Steel`, an accepted rate-confirm `RC-2026-0417`
   rendered as a contract card with full terms, status `confirmed`, CTA "Send for
   signature" → `sent`.
4. **Signed** — one signed `RateContract` (`Raleigh Freight Co.`) showing terms + pay
   terms, `signedAt`.

### Packet assembly rule (pure, unit-tested)

`packetDraft(lead, dossier)` builds per-lead requirements: the standard four
`coc`/`authority`/`w9`/`rate_agreement` map `onFile` from `dossier.docsOnFile`;
`additional_insured` is a lead-specific requirement (true only when that lead has an
endorsement on file — none seeded). `complete` = every required item `onFile`. Missing
items drive the compliance deep-link CTA.

### Mutations (shared store, route-handler pattern)

- `POST /api/portal/contracts` `{ action: 'send_packet', leadId }` →
  `portalApi.sendPacket(leadId)` sets `stage = 'packet_sent'`, `packetSentAt`, records a
  transport result. Only verified leads with a complete packet may send.
- `POST /api/portal/contracts` `{ action: 'send_for_signature', id }` →
  `portalApi.sendForSignature(id)` sets `status = 'sent'`, `sentAt`.
- `POST /api/portal/contracts` `{ action: 'sign', id }` →
  `portalApi.signContract(id)` sets `status = 'signed'`, `signedAt` and advances the
  lead to `signed`.
Client components call the route then `router.refresh()`, same as the accept-load flow.

### Honest transport seam

`lib/contract-send.ts` defines `ContractSendSeam { send(draft, recipient): Promise<SendReceipt> }`.
`OfflineContractSendSeam.send` returns `{ ok: true, deliveredTo: 'demo outbox (not emailed)', sourceLabel: 'mock — real delivery requires the Supabase Edge Function (dispatch-send) + Resend; see AGENTS.md' }`.
The Contracts page always shows the receipt with the mock label. No fake "emailed to broker."

### Page structure (server component + per-section client components)

One page, four sections in funnel order (mirrors how the portal lays out sections):
1. Leads (list w/ vet badge, stage chip, "Open packet" / "See contract" CTAs)
2. Carrier packet composer (for the selected/primary lead) w/ missing-doc callout
3. Rate confirmations ("confirmed/sent" cards, "Ask to sign")
4. Signed shelf

## 6. Data layer

`DataSeam` (in `lib/domain.ts`) gains:
- `getCompliance(): Promise<ComplianceDossier>`
- `getContractLeads(): Promise<ContractLead[]>`
- `getRateContracts(): Promise<RateContract[]>`
- `sendPacket(leadId: string): Promise<ContractLead>`
- `signContract(id: string): Promise<RateContract>`

`MockPortalApi` (`lib/mock-api.ts`) implements them. Logic + seeds live in new pure
modules so `mock-api.ts` stays an orchestrator and logic is unit-testable:
- `lib/compliance.ts` — `daysFromNow`, `deriveItemStatus`, `dossierVerdict`,
  `buildDossier()` (seed + derivation).
- `lib/contracts.ts` — lead/rate-contract seeds (vetting results pulled through
  `vettingSeam`), `packetDraft`, stage helpers.
- `lib/contract-send.ts` — transport seam.

Routes:
- `app/api/portal/compliance/route.ts` (GET)
- `app/api/portal/contracts/route.ts` (GET + POST actions)

## 7. UI / nav / icons

- `components/icons.tsx`: add `ShieldIcon` (Compliance), `HandshakeIcon` or `SignatureIcon`
  (Contracts) in the existing stroke style.
- `app/portal/layout.tsx`: two new `BASE_NAV` entries: `Compliance` → `/portal/compliance`,
  `Contracts` → `/portal/contracts`.
- Pages reuse `PageTitle`, `SectionCard`, `Badge`, `Stat`, `EmptyState`, `cn`, existing
  button/feedback primitives. No new design tokens.

## 8. Tests (`web/`, vitest)

- `tests/compliance.test.ts` — item status derivation boundaries (0, 1, 30, 31 days),
  verdict escalation, dossier completeness/determinism.
- `tests/contracts.test.ts` — packet completeness mapping from dossier, lead stage
  transitions (sendPacket), sign contract sets signedAt, seed leads resolve through
  `vettingSeam` without fabrication.
- Follow existing `tests/lib.test.ts` conventions.

## 9. Verification

From `web/`: `npx vitest run`, `npx tsc --noEmit`, `npx next lint` (per repo: run the
project's own scripts — check `web/package.json`).

## 10. File map

New:
- `web/src/lib/compliance.ts`
- `web/src/lib/contracts.ts`
- `web/src/lib/contract-send.ts`
- `web/src/app/portal/compliance/page.tsx`
- `web/src/app/portal/contracts/page.tsx`
- `web/src/app/portal/contracts/leads.tsx`, `packet.tsx`, `rate-contracts.tsx` (client
  sections, per-page folder pattern like `money/factoring.tsx`)
- `web/src/app/api/portal/compliance/route.ts`
- `web/src/app/api/portal/contracts/route.ts`
- `web/tests/compliance.test.ts`, `web/tests/contracts.test.ts`

Changed:
- `web/src/lib/domain.ts` (types + `DataSeam` methods)
- `web/src/lib/perspective.ts` (`runsOwnAuthority`)
- `web/src/lib/mock-api.ts` (`MockPortalApi` methods)
- `web/src/app/portal/layout.tsx` (nav)
- `web/src/components/icons.tsx` (2 icons)
