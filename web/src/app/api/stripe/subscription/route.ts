import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer, getSessionUser } from "@/lib/supabase/server";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

export async function GET() {
  if (!stripeKey) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sb = await getSupabaseServer();
    const { data: profile } = await sb
      .from("profiles")
      .select("stripe_subscription_id, subscription_tier, subscription_status, subscription_period_end")
      .eq("id", user.id)
      .single();
    return NextResponse.json({ subscription: profile ?? null });
  } catch (error) {
    console.error("Stripe subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!stripeKey) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID required" },
        { status: 400 }
      );
    }

    // Verify the subscription belongs to this user before canceling.
    const sb = await getSupabaseServer();
    const { data: profile } = await sb
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();
    if ((profile as { stripe_subscription_id?: string } | null)?.stripe_subscription_id !== subscriptionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canceled = await stripe.subscriptions.cancel(subscriptionId);

    return NextResponse.json({ success: true, subscription: canceled });
  } catch (error) {
    console.error("Stripe cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
