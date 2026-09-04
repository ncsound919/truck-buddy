import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

export async function GET() {
  try {
    // In a real implementation, you'd get the subscription ID from your database
    // For now, return a placeholder response
    return NextResponse.json({ subscriptionId: null });
  } catch (error) {
    console.error("Stripe subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID required" },
        { status: 400 }
      );
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
