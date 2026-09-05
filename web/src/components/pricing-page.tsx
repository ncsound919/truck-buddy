"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { createCheckoutSession, TIER_FEATURES } from "@/lib/stripe-client";

interface LivePrice {
  tier: string;
  amount: number;
  currency: string;
  interval: string;
  active: boolean;
}

function formatPrice(p: LivePrice | undefined): string {
  if (!p) return "…";
  return `$${(p.amount / 100).toFixed(p.amount % 100 === 0 ? 0 : 2)}/${p.interval === "year" ? "yr" : "mo"}`;
}

interface PricingCardProps {
  tier: "basic" | "pro" | "enterprise";
  currentTier?: string;
  priceLabel: string;
  onSubscribe: (tier: "basic" | "pro" | "enterprise") => Promise<void>;
  loading: boolean;
}

function PricingCard({ tier, currentTier, priceLabel, onSubscribe, loading }: PricingCardProps) {
  const features = TIER_FEATURES[tier];
  const isCurrent = currentTier === tier;
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubscribe() {
    setIsLoading(true);
    try {
      await onSubscribe(tier);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 p-6 ${
        tier === "pro"
          ? "border-accent bg-white shadow-lg"
          : "border-line bg-white"
      }`}
    >
      {tier === "pro" && (
        <div className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
          MOST POPULAR
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-xl font-extrabold text-ink">{features.name}</h3>
        <p className="mt-1 text-sm text-muted">{features.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-black text-ink">{priceLabel}</span>
      </div>
      <ul className="mb-6 space-y-3">
        {features.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckIcon
              width={16}
              height={16}
              className={`mt-0.5 shrink-0 ${tier === "pro" ? "text-accent" : "text-success"}`}
            />
            <span className="text-ink-2">{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSubscribe}
        disabled={loading || isLoading || isCurrent}
        className={`w-full rounded-xl py-3 text-sm font-bold transition ${
          isCurrent
            ? "cursor-not-allowed bg-line text-muted"
            : tier === "pro"
            ? "bg-accent text-white hover:bg-accent-600"
            : "bg-ink text-white hover:bg-ink-600"
        }`}
      >
        {isLoading ? "Redirecting..." : isCurrent ? "Current plan" : `Subscribe to ${features.name}`}
      </button>
    </div>
  );
}

interface PricingPageProps {
  currentTier?: string;
  userId?: string;
}

export function PricingPage({ currentTier = "basic", userId }: PricingPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<LivePrice[] | null>(null);
  const [pricesError, setPricesError] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((r) => {
        if (!r.ok) throw new Error(`prices_${r.status}`);
        return r.json();
      })
      .then((d) => setPrices(d.prices as LivePrice[]))
      .catch(() => setPricesError(true));
  }, []);

  async function handleSubscribe(tier: "basic" | "pro" | "enterprise") {
    setLoading(true);
    setError(null);
    try {
      const response = await createCheckoutSession(tier);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start checkout";
      // Not signed in → start sign-in, then come back to pricing.
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        window.location.href = "/auth?next=/portal/pricing";
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }

  const priceFor = (tier: string) =>
    pricesError ? "Unavailable" : formatPrice(prices?.find((p) => p.tier === tier));

  return (
    <div className="mx-auto max-w-5xl py-12 px-4">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-black text-ink">Choose your plan</h1>
        <p className="text-lg text-muted">
          Scale from solo driver to enterprise fleet. Cancel anytime.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <PricingCard
          tier="basic"
          currentTier={currentTier}
          priceLabel={priceFor("basic")}
          onSubscribe={handleSubscribe}
          loading={loading}
        />
        <PricingCard
          tier="pro"
          currentTier={currentTier}
          priceLabel={priceFor("pro")}
          onSubscribe={handleSubscribe}
          loading={loading}
        />
        <PricingCard
          tier="enterprise"
          currentTier={currentTier}
          priceLabel={priceFor("enterprise")}
          onSubscribe={handleSubscribe}
          loading={loading}
        />
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-bg-alt p-6">
        <h2 className="mb-4 text-xl font-extrabold text-ink">Frequently asked questions</h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-bold text-ink">Can I change plans later?</dt>
            <dd className="mt-1 text-sm text-muted">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the
              next billing cycle.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink">What payment methods do you accept?</dt>
            <dd className="mt-1 text-sm text-muted">
              We accept all major credit cards (Visa, Mastercard, American Express) through our
              secure Stripe payment processing.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink">Is there a free trial?</dt>
            <dd className="mt-1 text-sm text-muted">
              Basic plan includes a 14-day trial. Pro and Enterprise plans include a 30-day money-back
              guarantee.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-ink">How does billing work?</dt>
            <dd className="mt-1 text-sm text-muted">
              Billing is monthly, charged on the same day each month. Invoices are sent via email
              and available in your account.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}