import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUser } from "@/lib/supabase/server";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

const PRICE_IDS: Record<string, string> = {
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || "",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
};

export async function POST(request: Request) {
  if (!stripeKey || !PRICE_IDS.basic || !PRICE_IDS.pro || !PRICE_IDS.enterprise) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  try {
    const { tier } = await request.json();

    const priceId = PRICE_IDS[tier as string];
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid tier specified" },
        { status: 400 }
      );
    }

    // Get the base URL for redirect
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create checkout session (userId always comes from the session, never the client)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/portal/money?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/portal/money`,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
