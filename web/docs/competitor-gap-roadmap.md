# Truck Buddy — competitive gaps & leadership roadmap

Research date: 2026. Sources: provider sites pulled live where noted; otherwise
flagged as domain knowledge. Companion to `load-boards-integration.md`.

## Landscape — four layers
| Layer | Leaders | Moat they own |
|---|---|---|
| Loads/freight | DAT, Truckstop, Trucker Path, TruckSmarter, 123LB | Load supply + rate data |
| Driver super-app | **TruckSmarter** (500K+ dl, free 100K/day loads, AI Dispatch that bids/books/calls, fuel, factoring) | Distribution + transaction revenue |
| Compliance/ELD | Samsara, Motive, Geotab, Omnitracs (domain) | Hardware + HOS + fleet surveillance |
| Truck utility | Trucker Path (parking/fuel), Hammer/TruckMap | Niche utility |

Closest analog = TruckSmarter (verified live): AI assistant that *acts*, free
loads, monetizes transactions, sells "vs DAT / vs 123LoadBoard."

## Hard moats (don't build to beat)
1. Load supply + network effects (need brokers + carrier density).
2. ELD hardware certification — partner, don't build.
3. Proprietary rate/market data (DAT).
4. Distribution (TruckSmarter already 500K+).

## Defensible wedge
Competitors polarize: money/loads (serve driver to monetize them) OR
compliance/surveillance (serve fleet, watch driver). Underserved: a
**driver-trust-first operations copilot** unifying the CAB (OBD health,
hands-free, AI mechanic, no surveillance / local memory) with the DESK
(paperwork, dispatch, AI). Positioning: "Built for the driver, not the broker
or the fleet."

## Gap-to-lead backlog
| # | Gap | Hardness | Status |
|---|---|---|---|
| 1 | Predictive maintenance from OBD history (break before it happens) | Med | Building (heuristic trend now; ML seam later) |
| 2 | Payments / settlement / factoring (transaction revenue) | Med | Building (demo ledger + advance) |
| 3 | AI copilot that acts (book, call, monitor) | High | Action surface now; booking/telephony need provider keys |
| 4 | ELD/HOS compliance | Partner | Open |
| 5 | Dedicated routing + parking/fuel | Partner | Open |
| 6 | Broker load supply + driver density | Hard/slow | Open (free-board deep-links today) |

## Build order (recommended)
1. Predictive maintenance (differentiator, uses existing OBD + mechanic assets).
2. Payments/factoring (revenue model for the $10/$30/$199 tiers).
3. Honest copilot action surface; later wire real telephony/booking.
4. Partner integrations: ELD/HOS, routing/fuel, rate data.

## Honest constraints
- Rule-based trend/interval predictions are NOT machine learning — labelled so.
- No load-*booking* or broker-*calling* agent without provider keys + integrations.
- True durable cross-device persistence still needs the backend + auth decision
  (see load-boards-integration.md / portal sync notes).

# Multi-perspective model (CANONICAL)

Truck Buddy must serve truckers "from whichever perspective they're working":
owner-operators, leased drivers, and company drivers; box trucks up through
18-wheelers. Not one persona, one adapted experience.

## Operating profile
Captured once at setup, then drives what you see.

```
OperatingProfile {
  role:      'independent' | 'leased' | 'company'
  equipment: 'box_truck' | 'hotshot' | 'dry_van' | 'reefer' | 'flatbed' | 'tanker'
  authority: 'own' | 'carrier' | 'employer'
  set: boolean
}
```

Canonical sources (keep in sync — never fork the vocabulary):
- Web: `web/src/lib/perspective.ts` (+ `domain.ts` OperatingProfile/Load.equipmentType)
- App: `src/domain/profile.ts` (mirror)
Labels + compatibility: `web/src/lib/perspective.ts` (ROLE/EQUIPMENT/AUTHORITY_LABEL,
`compatibleEquipments`, `huntsOwnWork`, `canFactor`, `perspectiveLabel`).

## What the profile adapts (web portal, live)
| Role | Loads | Factoring | Dispatch | Perspective |
|---|---|---|---|---|
| independent / leased | Load board (matched to equipment) | independent + own authority | plus assigned | hunts own work |
| company | **No open board** — "Your dispatcher assigns your loads" | hidden (paid by employer) | assignments | assigned only |

Equipment also gates the **active workload seed** (below) and pre-filters the board.

## Workload seed design
No fixed "one demo driver." Each profile gets a context-appropriate active load:
`web/src/lib/mock-api.ts` `ACTIVE_SEED[equipment]` + `defaultWorkload(profile)`.

| Profile | Active load example |
|---|---|
| dry_van independent | ACME Class-8 haul (BOL-881220, board-accepted) |
| box_truck | local Raleigh→Cary box run (BOL-BX2031) |
| reefer / flatbed / hotshot / tanker | equipment-matched hauls |
| company (any) | same run re-sourced as **"Assigned · Dispatch"** by "Your carrier", no acceptance timestamp, no board |

## Sync & persistence status
- Web profile: shared server store behind `GET/POST /api/portal/profile`; nav/modules
  adapt (loads board, factoring) and header shows a perspective chip.
- App profile: on-device via `AsyncStorage` (`services/profile-store.ts`), picker at
  `/profile`, pill on idle home.
- **Not yet synced app↔web** (device vs server). Seam exists (`portal-client.ts`).
- **App behavioral seeds not yet applied** (labels only) — app flow store is
  actively owned by another agent; defer to avoid collisions.

## Open items
- [ ] Backend + auth to make profile durable and shared across devices.
- [ ] App-side behavioral seeding (routes/vehicles) per equipment.
- [ ] Fill each perspective with its own content (company compliance/ELD, box-truck
      local flow, independent factoring), not just gating.

