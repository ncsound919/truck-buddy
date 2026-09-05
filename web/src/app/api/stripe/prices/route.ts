import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const PRICE_IDS = [
  process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || "",
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
];

/**
 * Public plan pricing, read live from Stripe (source of truth).
 * Returns only public fields — no secrets. Unauthenticated on purpose:
 * the marketing site and logged-out visitors need real prices.
 * Missing/invalid config → 503, never placeholder numbers.
 */
export async function GET() {
  if (!stripeKey || PRICE_IDS.some((id) => !id)) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  try {
    const prices = await Promise.all(
      PRICE_IDS.map(async (id, i) => {
        const p = await stripe.prices.retrieve(id);
        const tier = ["basic", "pro", "enterprise"][i] as string;
        return {
          tier,
          amount: p.unit_amount ?? 0,
          currency: p.currency,
          interval: p.recurring?.interval ?? "once",
          active: p.active,
        };
      }),
    );
    return NextResponse.json(
      { prices },
      { headers: { "Access-Control-Allow-Origin": "*" } },
    );
  } catch (e) {
    console.error("Stripe prices error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "billing_lookup_failed" }, { status: 502 });
  }
}
