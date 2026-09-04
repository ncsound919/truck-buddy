# Truck Buddy — Marketing Plan (honest draft)

**Date:** 2026-09-04
**Status:** PLAN + ASSET DRAFTS — nothing published, no outreach executed, no lead/signup
machinery invoked. All claims below are anchored to what the product demonstrably is today.

---

## 0. Honest premise (read first)

Truck Buddy today is a **feature-complete beta with a mock backend**. The driver app and
web portal run end-to-end offline against deterministic fixtures; the lander says "Now in
beta" and the footer says "Demo concept." There is **no live payment, no real accounts, no
monetized backend**. The `com.anonymous.truckbuddy` bundle id confirms it is not store-deployed.

Therefore this plan does **not** promise "acquire X paying members." It defines the offer,
names the blockers that gate real acquisition, and stages only what is legitimate now:
**validate demand, build a beta waitlist, and collect signed testimonials — the only
currency that makes a later paid launch honest.**

Publishing a paid membership campaign against a demo backend would reproduce the exact
"marketing-ready theater" the ecosystem explicitly refuses. This plan does not do that.

## 1. What the product actually is (verified from source)

A hands-free, one-handed logistics companion for truckers spanning mobile + web:

- **Mobile (Expo, RN):** guided pre/post-trip inspections, sequenced route stops with ETA +
  mileage, geofence-triggered arrival, on-device OCR of BOL / invoice / delivery receipt,
  live OBD truck health read-aloud, one-tap call/SMS/email to stop contacts, detention logging
  with proof. Voice-first, eyes-up, works offline in the cab.
- **Web portal (`web/`):** driver portal with load board, dispatch + messages, documents +
  real OCR capture, money/factoring desk, vehicle + "copilot" assistant, setup flow.
- **Landers (`website/`, `web/src/app/page.tsx`):** consistent brand "Less paperwork. More
  road." — features, 4-step flow, ICP segments, and pricing tiers.

**Segments defined in source** (`web/src/app/page.tsx`, `src/domain/profile.ts`):
1. Owner-operators / independent (own authority)
2. Carriers & fleets (dispatch + driver mgmt)
3. Union drivers (driver-first membership)
Plus an "assistant" AI layer (web) and role model: independent / leased / company driver;
equipment: box truck → tanker.

**Pricing defined on landers (NOT live):** Basic $10/mo · Pro $30/mo · Fleet/Enterprise
$199/mo.

## 2. Positioning

**One-liner (already strong, keep):** "Less paperwork. More road."

**Positioning statement (proposed):** For owner-operators and small fleets who lose hours a
day to clipboard paperwork, Truck Buddy is the logistics hub that pairs a hands-free,
voice-first mobile companion with a full office portal — so inspections, documents,
dispatch, and pay stay in one flow, off the road and on it.

**Why now (the wedge):** Document capture + proof-of-delivery + detention logging are
concrete, painful, verifiable problems drivers already have. These convert as demos where
"AI dispatch assistant" remains abstract.

## 3. ICP — DECISION LOCKED: lead with **owner-operators**

**Locked 2026-09-04.** Evidence over coin-flip:
- Highest-fidelity features are built for a solo owner-op (OCR BOL/receipt + proof, detention
  logging, one-tap contact, default `independent`/`own` authority profile).
- Phase 0 goal (one real, named testimonial) is earliest to win in this segment.
- Small carrier = high ACV but **blocked** today by the missing live backend + fleet
  SSO/security. Company driver has no buying power (employer decides).
- (Consulted Dev-Brain `:3450` /api/marketing/decide — it returned a flat 33/33/34 tie
  because its matrix is an OSS-tool intake scorer that cannot parse marketing descriptions;
  recorded as input, overridden by the evidence above.)

### 3.1 Full ICP ladder (owner-ops first, others later)

| # | Segment | Core problem | Buy driver | Best proof feature |
|---|---|---|---|---|
| 1 | Owner-operator (own authority) | Paperwork + proof backlog eats driving time; no back office | Time back + clean records | OCR BOL/receipt → proof, detention logging |
| 2 | Company/leased driver | Inspection + ETA admin, chasing docs | Ease on the road | Guided inspections, geofence arrival |
| 3 | Small carrier / fleet (1–20 trucks) | Dispatch coordination + driver mgmt | Operational control | Portal: load board, dispatch, fleet dashboards |

Fleet/Enterprise is the high-ACV prize but requires a real backend + SSO/security story
before procurement takes it seriously — gated below.

## 4. Blocker gates (must clear before paid acquisition)

1. **Live backend + real accounts** — the #1 blocker. Marketing cannot honestly sell a demo.
2. **Store deployment** — replace `com.anonymous.truckbuddy`; ship APK/IPA + store listing.
3. **Payment wiring** — lander prices exist but nothing charges. Hook Stripe to real plans.
4. **SSO/security for Enterprise** — fleets require real access control before $199/mo.
5. **Consent/compliance** — any cold outreach or driver-contact capture needs defined policy.

Until (1)–(3) clear, the only honest acquisition goal is a **beta waitlist**.

## 5. Phase 0 (now — legitimate, no paid promises)

**Goal:** Prove demand + collect 3–5 real, attributable testimonials from beta drivers.

Channels (in order of fit for drivers):
- **Truck-stop / driver communities** (real places owner-ops gather online).
- **Freight/dispatch Facebook + Reddit groups** (r/Truckers, r/OwnerOperators, dispatch groups).
- **Carrier & driver podcast / newsletter co-marketing.**
- **LinkedIn** for the fleet/enterprise angle (small carriers, dispatch managers).

Offer: **free beta + waitlist**, framed as "help shape the trucking companion," CTA to run
one demo shift. Ask is small and honest: install the build, run one load, tell us what broke.

Waitlist is the only KPI Phase 0 must hit — because a waitlist is real evidence; a made-up
signup count is not.

## 6. Success metrics (real, measurable)

- **Beta waitlist signups** (real email captures) — the honest North Star for Phase 0.
- **Demo shift completions** (install → run one load end-to-end, from app telemetry).
- **Attributable testimonials** (named driver, quote, which load they ran) — the raw material
  for the paid launch.
- **Cost per qualified lead** on any paid channel (track to demo starts, not clicks).

No fabricated subscriber counts, no invented conversion %, no "results" without a source.

## 7. Pipeline to paid (when blockers clear)

1. Real backend + store deploy + Stripe plans (Basic/Pro/Fleet) go live.
2. Paid launch to the **waitlist** first (warmest, already opted in) — announce, give beta
   cohort founding-member pricing, collect the first real paid members.
3. Fleet/Enterprise: one named design-partner carrier on a pilot before public $199/mo claims.
4. Refresh lander + asset library with real testimonials + real demo recordings.

The waitlist built in Phase 0 is the asset that makes the paid launch honest: those are real
people who ran the product, not a fabricated audience.

## 8. Do NOT do until gates clear

- Paid membership ads ("Get Truck Buddy Pro now") against a demo backend.
- Fabricated testimonials or invented case studies.
- Claiming fleet/enterprise SSO or security we have not shipped.
- Cold outreach for a service with no live signup path.

## 9. Next decision (operator)

1. Confirm Phase 0 focus (waitlist + beta testimonials) OR say blockers (1)–(3) have cleared
   and marketing may target live paid signups.
2. Confirm which single ICP segment to lead with for the first content asset set.
3. Name the waitlist capture location (email form endpoint / product URL).
