"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalIcon } from "@/components/icons";
import { TIER_FEATURES } from "@/lib/stripe-client";
import type { Invoice } from "@/lib/stripe-client";

async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const res = await fetch("/api/stripe/invoices?limit=5");
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

interface SubscriptionInfo {
  stripe_subscription_id?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
}

async function fetchSubscription(): Promise<SubscriptionInfo | null> {
  try {
    const res = await fetch("/api/stripe/subscription");
    if (!res.ok) return null;
    const data = await res.json();
    return (data.subscription ?? null) as SubscriptionInfo | null;
  } catch {
    return null;
  }
}

export function BillingSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchInvoices(), fetchSubscription()]).then(([inv, sub]) => {
      setInvoices(inv);
      setSubscription(sub);
      setLoading(false);
    });
  }, []);

  const currentTier = subscription?.subscription_tier || "basic";
  const tierInfo = TIER_FEATURES[currentTier] || TIER_FEATURES.basic;

  return (
    <SectionCardWithTitle
      title="Billing"
      action={
        <Link href="/portal/pricing">
          <Button size="sm" variant="outline">
            Change plan
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Current Plan */}
        <div className="rounded-lg border border-line p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">Current plan</h3>
              <p className="text-2xl font-black text-accent">{tierInfo.name}</p>
              <p className="text-xs text-faint">
                {subscription?.subscription_status
                  ? `Status: ${subscription.subscription_status}`
                  : "No active subscription"}
                {subscription?.subscription_period_end
                  ? ` · renews ${new Date(subscription.subscription_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : ""}
              </p>
            </div>
            <Badge tone="success">{currentTier.toUpperCase()}</Badge>
          </div>
        </div>

        {/* Recent Invoices */}
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink">Recent invoices</h3>
          {loading ? (
            <div className="text-sm text-faint">Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="text-sm text-faint">No invoices yet.</div>
          ) : (
            <ul className="space-y-2.5">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {inv.lines[0]?.description || inv.id}
                    </div>
                    <div className="text-xs text-faint">
                      {new Date(inv.created).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-ink">
                      ${(inv.amount / 100).toFixed(2)}
                    </span>
                    <Badge tone="success">{inv.status}</Badge>
                    {inv.hostedInvoiceUrl && (
                      <a href={inv.hostedInvoiceUrl} target="_blank">
                        <ExternalIcon width={14} height={14} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {invoices.length > 0 && (
            <Link href="https://dashboard.stripe.com/test/invoices" target="_blank">
              <span className="mt-2 inline-block text-xs font-bold text-accent hover:underline">
                View all in Stripe →
              </span>
            </Link>
          )}
        </div>
      </div>
    </SectionCardWithTitle>
  );
}

function SectionCardWithTitle({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}