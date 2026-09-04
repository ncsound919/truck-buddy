/**
 * Stripe integration for Truck Buddy portal.
 * 
 * Pricing tiers:
 * - Basic: $19/mo - up to 30 loads/mo, basic analytics
 * - Pro: $49/mo - unlimited loads, advanced analytics, FMCSA checks
 * - Enterprise: $129/mo - dedicated account manager, priority dispatch, 
 *   multi-user teams, API access
 * 
 * Uses Stripe Checkout for subscription management. Invoices are generated
 * automatically by Stripe on the billing cycle.
 */

export const STRIPE_PRODUCT_IDS = {
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || "price_basic_demo",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "price_pro_demo",
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "price_enterprise_demo",
} as const;

export const TIER_FEATURES: Record<string, { name: string; description: string; price: string; features: string[] }> =
  {
    basic: {
      name: "Basic",
      description: "Solo drivers and small fleets getting started.",
      price: "$19/mo",
      features: ["Up to 30 loads per month", "Basic analytics", "Load alerts", "Mobile app access"],
    },
    pro: {
      name: "Pro",
      description: "Growing fleets with advanced needs.",
      price: "$49/mo",
      features: ["Unlimited loads", "Advanced analytics", "FMCSA vetting checks", "Priority dispatch", "Document capture"],
    },
    enterprise: {
      name: "Enterprise",
      description: "Large fleets and organizations.",
      price: "$129/mo",
      features: ["Unlimited users", "Dedicated account manager", "API access", "Bulk document processing", "Custom integrations", "SLA support"],
    },
  };

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export async function createCheckoutSession(
  tier: keyof typeof STRIPE_PRODUCT_IDS,
  userId: string,
): Promise<StripeCheckoutResponse> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier, userId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Checkout failed");
  }

  return res.json();
}

export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/stripe/subscription", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Cancel failed");
  }

  return res.json();
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  created: string;
  dueDate?: string;
  hostedInvoiceUrl?: string;
  lines: Array<{
    description: string;
    quantity: number;
    amount: number;
  }>;
}

export async function listInvoices(limit = 10): Promise<Invoice[]> {
  const res = await fetch(`/api/stripe/invoices?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load invoices");
  return res.json();
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await fetch(`/api/stripe/invoices/${id}`);
  if (!res.ok) throw new Error("Failed to load invoice");
  return res.json();
}

/**
 * Generate a one-off invoice for overages or additional services.
 * Used for per-load charges beyond the tier limit.
 */
export async function createOneOffInvoice(
  amount: number,
  description: string,
  userId: string,
): Promise<{ invoiceId: string; hostedUrl: string }> {
  const res = await fetch("/api/stripe/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, description, userId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Invoice creation failed");
  }

  return res.json();
}

/**
 * Record a payment event from a completed checkout session.
 * Called via webhook - creates/updates the subscription record.
 */
export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
