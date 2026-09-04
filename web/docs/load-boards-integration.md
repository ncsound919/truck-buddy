# Load boards — research & integration notes

Research date: 2026. Prices pulled live from provider sites (not estimates).
Owner-operator / carrier side only.

## Free boards (deep-link model — already in `/portal/loads`)

Genuinely free to *search and book* as a user in their own product. We deep-link
(no keys, no scraping). Login may be required to see rates.

| Board | URL | Cost | Notes |
|---|---|---|---|
| TruckSmarter | trucksmarter.com/free-load-boards | Free | Aggregates multiple sources; rate + dispatch tools |
| Trucker Path · TruckLoads | truckerpath.com/truckloads/free-load-board | Free | 150k+ daily loads |
| Trulos | trulos.com | Free | 85k+ weekly; search w/o account |
| C.H. Robinson | chrobinson.com/en-us/carriers/loadboard | Free | Largest free NA board; login for rates |
| Direct Freight | directfreight.com/home | Free | 300k+ daily loads |
| J.B. Hunt | jbhunt.com/loadboard/load-board/map | Free | J.B. Hunt freight by map |
| DAT | dat.com/free-load-board | Free tier | Location-only; upgrade for full depth |
| **Convoy** | — | — | **REMOVED — load board shut down late 2023** |

## Low-cost paid boards (verified current pricing)

| Board | Plan | Price | Notes |
|---|---|---|---|
| 123Loadboard | Standard | **$39/mo** | Unlimited search + truck posting, alerts, doc storage |
| 123Loadboard | Premium | **$59/mo** | + credit scores, favorite/block, backhauls |
| 123Loadboard | Premium Plus | **$79/mo** | + PC*Miler routing/tolls, IFTA, rate check, trip builder |
| DAT | Standard | **$59/mo** | **Capped: 500 load searches/posts per MONTH** |
| DAT | Enhanced | $149/mo | 15-day lane rates |
| DAT | Pro | $169/mo | 7-day rates, TriHaul |
| DAT | Select / Office | $259 / $339 | Fleets |

- 123Loadboard: 10-day free trial, no contracts, no hidden fees.
- Truckstop: public pricing not surfaced (login); do not guess.

### Read on cost vs. ingest

- **Cheapest to run** = 123Loadboard Standard ($39).
- **Volume/rates leader** = DAT, but the $59 entry tier is **capped at 500
  searches/month** — that cap breaks an aggregator that mirrors a live feed;
  uncapped tiers are $149+.

## 123Loadboard API — chosen first programmatic source

Reality check: the **$39 carrier plan buys searching in their UI, not their API.**
Load retrieval is a **developer/partner integration**:

- Developer portal: https://developers.123loadboard.com (login / developer account)
- Integrations contact: partner-integrations@123loadboard.com · 437-887-2934
- Published capabilities (from /api/): Post Loads, Post Trucks, **Search Loads**,
  Check Rates, Search Trucks, Message, Bidding, Book now.
- **Search Loads** = query load board by equipment type, origin, filters →
  this is the feed endpoint Truck Buddy wants.
- Each integrator is assigned a tech lead (guided onboarding) → implies an
  approval/relationship gate + 123Loadboard-issued credentials.

Spec PDF (endpoint + schema): `TMS-Integration-API-123Connect.pdf`
`https://s1pststd03.blob.core.windows.net/cms/2022/02/TMS-Integration-API-123Connect.pdf`

## Truck Buddy plan

1. Keep free boards as deep-links (done).
2. **Add 123Loadboard as a real aggregated source** via Search Loads API.
   - Adapter reads credentials/config from env (never hardcode).
   - BLOCKED on: operator obtaining a 123Loadboard developer account + issued
     credentials, and confirming the endpoint/payload contract (the PDF above;
     not yet parsed in-repo).
3. Later: DAT as premium source once budget allows; monitor the 500/mo cap.

## Open questions
- [ ] Operator's 123Loadboard developer credentials (store via Keywire, not repo).
- [ ] Exact Search Loads endpoint + query schema (from spec or developer portal).
- [ ] Whether 123Loadboard charges API/integrator pricing beyond the UI plan.

## OSS / free tooling map (verified 2026)

Live load *posts* have no OSS/free source — keep commercial. The surrounding
platform tooling is OSS-able and is where effort should go.

| Need | Tool | Auth | Notes |
|---|---|---|---|
| Carrier/broker vetting on accept | FMCSA data | Free, no key (keyless) | Authority/insurance via li-public.fmcsa.dot.gov / Company Snapshot files. SMS safety data public but property-carrier Crash/HazMat hidden (FAST Act). Clean API (SAFER QCMobile) may need a registered webKey — design keyless w/ snapshot + manual DOT fallback. |
| OCR (BOL/receipt capture) | Tesseract.js (Apache-2.0, 38.7k★) | Free | Browser+Node; run client with CDN worker/core paths to avoid bundling. No PDF (Scribe.js for that). |
| Mileage / routing / ETA | OSRM, Valhalla, GraphHopper | OSS self-host / free tiers | Truck profile tuning needed. |
| Map render | MapLibre GL JS / Leaflet | OSS | Lanes + stop maps. |
| Lanes/geocoding | Nominatim / OSM | Free, rate-limited | |

Current status: FMCSA vetting + geodesic mileage + Tesseract OCR are wired as
seams with demo data; live data needs the keyless FMCSA snapshot fetch or a
webKey, and a routing host.

