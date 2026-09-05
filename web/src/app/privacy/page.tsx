import type { Metadata } from 'next';

import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';

export const metadata: Metadata = {
  title: 'Privacy — Truck Buddy',
  description: 'How Truck Buddy collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-accent">Legal</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Privacy policy</h1>
        <p className="mt-2 text-sm text-faint">
          Last updated: September 2026 · <a className="text-accent" href="mailto:hello@truckbuddy.online">hello@truckbuddy.online</a>
        </p>

        <h2 className="mt-8 text-xl font-extrabold text-ink">What we collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li><strong>Account data:</strong> your email, used to sign in (via Supabase) and manage your subscription (via Stripe). We never store your card number — payment details go straight to Stripe.</li>
          <li><strong>Shift data you create:</strong> stops, scanned documents, and messages you send. Stored on your device; emailed items transmit once to the recipient you chose.</li>
          <li><strong>Location:</strong> used on-device only to detect arrival at a stop. It is never uploaded on its own.</li>
          <li><strong>This site:</strong> no advertising trackers. Fonts load from Google Fonts, which receives a standard web request.</li>
        </ul>

        <h2 className="mt-8 text-xl font-extrabold text-ink">What we share</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li><strong>Resend</strong> — delivers emails and carrier-gateway texts you explicitly send. Recipients see your name and unit.</li>
          <li><strong>Stripe</strong> — processes subscriptions, subject to Stripe&apos;s privacy policy.</li>
          <li><strong>Supabase</strong> — hosts authentication and subscription records.</li>
        </ul>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">We do not sell personal data. We do not share data with advertisers.</p>

        <h2 className="mt-8 text-xl font-extrabold text-ink">Your rights</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Ask for a copy, correction, or deletion of your data at <a className="text-accent" href="mailto:hello@truckbuddy.online?subject=Privacy%20request">hello@truckbuddy.online</a>.
          Deleting your account removes your cloud records; data already emailed to recipients you chose cannot be recalled.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
