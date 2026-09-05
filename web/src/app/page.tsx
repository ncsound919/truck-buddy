import Link from 'next/link';

import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { Reveal } from '@/components/reveal';
import { PageViewBeacon } from '@/components/ops/page-view-beacon';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Kicker } from '@/components/ui/card';
import {
  CheckIcon,
  ClipboardIcon,
  DocIcon,
  HealthIcon,
  RouteIcon,
  ScanIcon,
  TruckIcon,
} from '@/components/icons';

const FEATURES = [
  { icon: ClipboardIcon, title: 'Guided inspections', body: 'Pre- and post-trip checklists with one-thumb Pass / flag. Issues become voice notes, not clipboard scribbles.' },
  { icon: RouteIcon, title: 'Routes & dispatch', body: 'Every load sequenced with ETA and mileage. Finish one and the next is queued before you pull away.' },
  { icon: ScanIcon, title: 'Scan any document', body: 'Point at the BOL, invoice, or delivery receipt. OCR reads it, extracts the fields, and files it for you.' },
  { icon: HealthIcon, title: 'Truck health, read out', body: 'Sample diagnostics today — coolant, battery, fuel, and fault codes. Connect your ELD or telematics feed to go live.' },
  { icon: TruckIcon, title: 'Fleet & owner-ops', body: 'Owner-operator tools with the option to scale into dispatch, driver management, and fleet dashboards.' },
  { icon: DocIcon, title: 'Everything off the road', body: 'Loads, documents, payments, and messages in one portal — so the office lives in the truck with you.' },
];

const STEPS = [
  { num: '01', title: 'Find the load', body: 'Browse the live load board on the portal. See rate, miles, and pickup window at a glance.' },
  { num: '02', title: 'Inspect & roll', body: 'Run the guided pre-trip check. The app confirms the truck is road-ready, then reads your route aloud.' },
  { num: '03', title: 'Scan & deliver', body: 'Arrive, point at the paperwork, and let OCR verify the details while you unload.' },
  { num: '04', title: 'Get paid', body: 'Documents reconcile automatically. Earnings and settlements post to your portal dashboard.' },
];

const TIERS = [
  { name: 'Basic', price: '$19', blurb: 'Everything a solo driver needs to run clean paperwork.', cta: 'Start Basic', highlight: false, features: ['Guided inspections', 'Route stops & navigation', 'Document capture', 'Truck health readouts', 'Email support'] },
  { name: 'Pro', price: '$49', blurb: 'Add extra logistics assistance — routing, dispatch, and unlimited OCR.', cta: 'Go Pro', highlight: true, features: ['Everything in Basic', 'Extra logistics assistance', 'Unlimited OCR documents', 'Automatic geofence arrival', 'Priority support'] },
  { name: 'Fleet / Enterprise', price: '$129', blurb: 'A dedicated desk for fleets and dispatchers running many trucks.', cta: 'Talk to us', highlight: false, features: ['Everything in Pro', 'Fleet dashboards & reports', 'Team & driver management', 'Dedicated logistics coordinator', 'Onboarding & support'] },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <PageViewBeacon />
      <main>
        <Hero />
        <StatsBar />
        <FeatureSection />
        <HowItWorks />
        <ForCarriers />
        <PricingSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#eef4ff_0%,#ffffff_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_32rem_at_75%_-10%,rgba(15,107,255,0.16),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_28rem_at_-10%_20%,rgba(15,107,255,0.1),transparent)]" />
        <div className="absolute inset-0 opacity-[0.4] [background-image:linear-gradient(rgba(15,107,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,107,255,0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,#000_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-20 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="animate-fade-up">
          <Badge tone="accent" className="glass uppercase shadow-[var(--shadow-card)]">
            Now in beta · Web, Android &amp; iOS
          </Badge>
          <h1 className="balance mt-6 text-[2.75rem] font-black leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl md:text-[4.25rem]">
            Less paperwork.
            <br />
            <span className="bg-gradient-to-r from-accent to-[#4b8dff] bg-clip-text text-transparent">
              More road.
            </span>
          </h1>
          <p className="pretty mt-7 max-w-lg text-lg leading-relaxed text-muted">
            Truck Buddy is the logistics hub for off the road and the hands-free companion for on
            it — loads, inspections, documents, dispatch, and money in one flow.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/portal" size="lg">Open the driver portal</ButtonLink>
            <ButtonLink href="/#how-it-works" variant="outline" size="lg">See how it works</ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap gap-2.5">
            {['Hands-free on the road', 'Full logistics desk on the web', 'Works offline in the cab'].map((t) => (
              <li
                key={t}
                className="glass inline-flex items-center gap-2 rounded-full border border-white/70 px-3.5 py-2 text-[13px] font-semibold text-ink-2 shadow-[var(--shadow-card)]"
              >
                <CheckIcon width={15} height={15} className="text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMock />
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto hidden w-[300px] md:block animate-fade-in" style={{ animationDelay: '140ms' }} aria-hidden>
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-[56px] bg-[radial-gradient(closest-side,rgba(15,107,255,0.22),transparent)] blur-2xl" />
      <div className="animate-float-slow relative aspect-[9/19] overflow-hidden rounded-[46px] border-[10px] border-[#0e1c33] bg-surface shadow-[var(--shadow-pop)]">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(100%_100%_at_50%_0%,rgba(15,107,255,0.35),transparent)]" />
        <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[#0e1c33]" />
        <div className="relative flex h-full flex-col gap-3 px-5 pb-5 pt-16 text-[#dbe6ff]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#9fb4d8]">
            <span className="h-2 w-2 rounded-full bg-[#37d67a] shadow-[0_0_8px_#37d67a]" />
            Load 1 of 3
          </div>
          <div className="text-[19px] font-extrabold leading-tight text-white">
            ACME Distribution Center
          </div>
          <div className="text-[13px] text-[#9fb4d8]">Charlotte, NC · ETA 32 min</div>
          <div className="glass-dark mt-1 space-y-2.5 rounded-2xl p-3.5 text-[13px] text-[#c3d2ec]">
            <div className="flex justify-between"><span>Engine</span><span className="font-bold text-[#7be2a6]">Nominal</span></div>
            <div className="flex justify-between"><span>Coolant</span><span className="font-bold text-[#7be2a6]">192°F</span></div>
            <div className="flex justify-between"><span>Battery</span><span className="font-bold text-[#7be2a6]">13.8V</span></div>
          </div>
          <div className="rounded-xl border border-[#1c4a75] bg-[#12314d]/70 px-3 py-2 text-[12px] text-[#9fd3ff]">
            <span className="font-extrabold text-white">BOL-881220</span> verified
          </div>
          <div className="mt-auto rounded-2xl bg-gradient-to-b from-[#2b7fff] to-accent py-3.5 text-center text-sm font-extrabold text-white shadow-[var(--shadow-glow)]">
            Arrived · Start unloading
          </div>
        </div>
      </div>
      <div className="glass absolute right-[-78px] top-28 z-20 max-w-[212px] rounded-[16px_16px_16px_6px] border border-white/70 p-4 text-sm font-bold text-ink shadow-[var(--shadow-pop)]">
        You&rsquo;ve arrived.
        <br />
        Scan the delivery receipt.
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    ['1-tap', 'document capture with on-device OCR'],
    ['Email + text', 'that actually send, with offline retry'],
    ['Hands-free', 'spoken navigation and status readouts'],
    ['3 platforms', 'Android, iOS and web — one account'],
  ];
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[radial-gradient(70rem_30rem_at_50%_-20%,#102c54,transparent),linear-gradient(180deg,#0b1626,#0a1320)]">
      <div aria-hidden className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-14 lg:grid-cols-4">
        {stats.map(([v, l]) => (
          <div key={l} className="group">
            <div className="text-4xl font-black tracking-tight text-white transition-transform duration-200 group-hover:-translate-y-0.5 md:text-5xl">
              <span className="bg-gradient-to-b from-white to-[#c9d8f0] bg-clip-text text-transparent">{v}</span>
            </div>
            <div className="mt-2 text-sm leading-snug text-[#93a7c8]">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl">
      <Kicker>{kicker}</Kicker>
      <h2 className="balance mt-3 text-4xl font-black leading-[1.08] tracking-[-0.025em] text-ink md:text-[44px]">{title}</h2>
      {body ? <p className="pretty mt-4 text-lg leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

function FeatureSection() {
  return (
    <section id="product" className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          kicker="The platform"
          title="One hub for the whole day"
          body="Every step — on the road and at the desk — is wired together so the truck, the paperwork, and the route stay in sync."
        />
        <Reveal className="reveal-stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="group card card-lift rounded-2xl border border-line bg-white p-6 transition-[border-color] hover:border-accent/20"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                <f.icon width={22} height={22} />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-ink">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.body}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-line bg-bg-alt px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead kicker="How it works" title="From load to payday — in one place" />
        <Reveal>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.num} className="card card-lift relative rounded-2xl bg-white p-6">
                <div className="absolute right-5 top-4 text-[13px] font-black tracking-widest text-accent/15">{`0${i + 1}`}</div>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-black text-accent">{s.num}</div>
                <h3 className="text-lg font-extrabold tracking-tight text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

function ForCarriers() {
  const items = [
    ['Owner-operators', 'Run your paperwork and loads like a pro without hiring a back office.'],
    ['Carriers & fleets', 'Dispatch, manage drivers, and watch fleet health in real time.'],
    ['Shippers & brokers', 'Post loads, track delivery proof, and settle faster with verified records.'],
  ];
  return (
    <section id="for-carriers" className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead kicker="Built for the road" title="Who Truck Buddy is for" />
        <Reveal className="reveal-stagger grid gap-5 md:grid-cols-3">
          {items.map(([t, b]) => (
            <article key={t} className="card card-lift rounded-2xl border border-line bg-white p-6">
              <h3 className="text-lg font-extrabold tracking-tight text-ink">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{b}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="border-y border-line bg-bg-alt px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead kicker="Pricing" title="Simple plans. Pay only for the help you need." />
        <Reveal className="reveal-stagger grid gap-6 lg:grid-cols-3">
          {TIERS.map((t) => (
            <article
              key={t.name}
              className={
                t.highlight
                  ? 'card-lift relative flex flex-col rounded-3xl border-2 border-accent bg-white p-7 shadow-[var(--shadow-glow)]'
                  : 'card card-lift relative flex flex-col rounded-3xl border border-line bg-white p-7'
              }
            >
              {t.highlight ? (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-accent to-[#2b7fff] px-3 py-1 text-xs font-extrabold text-white shadow-[var(--shadow-card)]">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink-2">{t.name}</h3>
              <div className="mt-3 text-4xl font-black tracking-tight text-ink">
                {t.price}
                <span className="text-lg font-semibold text-muted">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted">{t.blurb}</p>
              <ul className="mb-7 mt-5 flex flex-col gap-3 text-[15px] font-medium text-ink-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckIcon width={17} height={17} className="mt-0.5 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <ButtonLink href="/portal/pricing" variant={t.highlight ? 'primary' : 'secondary'} className="w-full">
                  {t.cta}
                </ButtonLink>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(50rem_26rem_at_50%_-10%,#2b7fff,transparent),linear-gradient(135deg,#0f6bff_0%,#0b47b8_100%)] px-5 py-24 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <Reveal className="relative mx-auto max-w-2xl">
        <h2 className="balance text-4xl font-black leading-[1.05] tracking-[-0.025em] text-white md:text-5xl">
          Ready to put the paper away?
        </h2>
        <p className="pretty mx-auto mt-5 max-w-md text-lg leading-relaxed text-[#dbe6ff]">
          Pick a plan and run your first hands-free shift this week.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/portal/pricing" variant="light" size="lg">See plans &amp; pricing</ButtonLink>
          <Link
            href="https://truckbuddy.online/download"
            className="inline-flex h-[52px] items-center justify-center rounded-xl border border-white/40 bg-white/5 px-7 text-base font-bold text-white transition hover:border-white hover:bg-white/10"
          >
            Download Android
          </Link>
        </div>
        <p className="mt-7 text-sm font-medium text-[#c9dcf7]">
          Cancel anytime · Android, iOS &amp; web
        </p>
      </Reveal>
    </section>
  );
}
