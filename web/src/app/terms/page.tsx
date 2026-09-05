import type { Metadata } from 'next';

import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';

export const metadata: Metadata = {
  title: 'Terms — Truck Buddy',
  description: 'The terms for using Truck Buddy.',
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-accent">Legal</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Terms of service</h1>
        <p className="mt-2 text-sm text-faint">
          Last updated: September 2026 · <a className="text-accent" href="mailto:hello@truckbuddy.online">hello@truckbuddy.online</a>
        </p>

        <h2 className="mt-8 text-xl font-extrabold text-ink">The service</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Truck Buddy provides a driver companion app (Android, iOS, web) and a billing portal. The
          service is in beta: features evolve weekly and occasional downtime is possible. On-duty,
          hours-of-service, and inspection records are driver aids — not a certified ELD.
        </p>

        <h2 className="mt-8 text-xl font-extrabold text-ink">Subscriptions and billing</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>Plans are per driver, per month, billed monthly through Stripe. Current prices on the <a className="text-accent" href="/portal/pricing">pricing page</a> are the binding list.</li>
          <li>Cancel anytime from the portal; access continues until the end of the paid period. No refunds for partial months.</li>
        </ul>

        <h2 className="mt-8 text-xl font-extrabold text-ink">Messaging</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>Texts to third parties (e.g. consignees) send only when you explicitly enable them, include your name and unit, and travel via the recipient carrier&apos;s relay.</li>
          <li>You are responsible for recipients&apos; consent to text them and for the phone numbers you enter.</li>
          <li>Do not use the service for spam, unlawful content, or to impersonate anyone.</li>
        </ul>

        <h2 className="mt-8 text-xl font-extrabold text-ink">Acceptable use</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          No reverse-engineering the apps to evade billing, probing other customers&apos; accounts, or
          unlawful use. We may suspend accounts that abuse the service or the messaging relays.
        </p>

        <h2 className="mt-8 text-xl font-extrabold text-ink">Liability</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          The service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, Truck Buddy is not
          liable for indirect or consequential damages. Direct damages are limited to the fees paid in
          the prior three months.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
