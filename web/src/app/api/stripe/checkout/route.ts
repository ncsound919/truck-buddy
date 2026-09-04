import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

export async function POST(request: Request) {
  try {
    const { tier, userId } = await request.json();

    // Validate tier
    const priceIdMap: Record<string, string> = {
      basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC!,
      pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!,
      enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!,
    };

    const priceId = priceIdMap[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid tier specified" },
        { status: 400 }
      );
    }

    // Get the base URL for redirect
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create checkout session
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
        userId,
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
