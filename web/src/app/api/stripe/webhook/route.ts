import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Stripe webhook handler for subscription lifecycle events.
 * 
 * Handles:
 * - checkout.session.completed → create/update subscription record
 * - customer.subscription.updated → update subscription status
 * - customer.subscription.deleted → mark subscription as canceled
 * - invoice.paid → update last payment date
 * - invoice.payment_failed → mark subscription as past_due
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  // Verify webhook signature
  if (endpointSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Development: parse without verification
    event = JSON.parse(body);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Record processed event for idempotency
    await recordWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const supabase = createClient();
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Get tier from metadata
  const tier = (session.metadata?.tier || "basic") as "basic" | "pro" | "enterprise";

  // Get the price ID to determine tier if not in metadata
  if (!tier && session.line_items?.data[0]?.price?.id) {
    const priceId = session.line_items.data[0].price.id;
    const tierMap: Record<string, "basic" | "pro" | "enterprise"> = {
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || ""]: "basic",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || ""]: "pro",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || ""]: "enterprise",
    };
    // Will be set via subscription lookup in handleSubscriptionUpdated
  }

  // Fetch the subscription to get period end
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = getPeriodEnd(subscription);

  // Update user's profile
  await supabase.from("profiles").upsert({
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_tier: tier,
    subscription_status: subscription.status,
    subscription_period_end: new Date(periodEnd * 1000).toISOString(),
  });

  console.log(`Checkout complete: customer=${customerId}, subscription=${subscriptionId}, tier=${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createClient();
  const customerId = subscription.customer as string;
  const periodEnd = getPeriodEnd(subscription);

  // Get tier from price ID
  const priceId = subscription.items.data[0]?.price?.id || "";
  const tierMap: Record<string, "basic" | "pro" | "enterprise"> = {
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC || ""]: "basic",
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || ""]: "pro",
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || ""]: "enterprise",
  };
  const tier = tierMap[priceId] || "basic";

  await supabase.from("profiles").update({
    subscription_tier: tier,
    subscription_status: subscription.status,
    subscription_period_end: new Date(periodEnd * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("stripe_customer_id", customerId);

  // Update org tier if org has stripe_customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .single();

    if (membership) {
      await supabase.from("organizations").update({
        tier,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      }).eq("id", membership.org_id);
    }
  }

  console.log(`Subscription updated: customer=${customerId}, tier=${tier}, status=${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createClient();
  const customerId = subscription.customer as string;

  await supabase.from("profiles").update({
    subscription_status: "canceled",
    updated_at: new Date().toISOString(),
  }).eq("stripe_customer_id", customerId);

  // Downgrade org tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .single();

    if (membership) {
      await supabase.from("organizations").update({
        tier: "basic",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", membership.org_id);
    }
  }

  console.log(`Subscription canceled: customer=${customerId}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = createClient();
  const customerId = invoice.customer as string;

  // Cache the invoice
  await supabase.from("invoices").upsert({
    id: invoice.id,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: "paid",
    hosted_invoice_url: invoice.hosted_invoice_url || undefined,
    invoice_pdf: invoice.invoice_pdf || undefined,
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : undefined,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : undefined,
  }, { onConflict: "id" });

  console.log(`Invoice paid: ${invoice.id}, customer=${customerId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createClient();
  const customerId = invoice.customer as string;

  // Mark subscription as past_due
  await supabase.from("profiles").update({
    subscription_status: "past_due",
    updated_at: new Date().toISOString(),
  }).eq("stripe_customer_id", customerId);

  // Cache the invoice
  await supabase.from("invoices").upsert({
    id: invoice.id,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: "open",
    hosted_invoice_url: invoice.hosted_invoice_url || undefined,
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : undefined,
  }, { onConflict: "id" });

  console.log(`Payment failed: ${invoice.id}, customer=${customerId}`);
}

async function recordWebhookEvent(event: Stripe.Event) {
  try {
    const supabase = createClient();
    await supabase.from("stripe_webhook_events").upsert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    }, { onConflict: "id" });
  } catch (error) {
    // Log but don't fail - webhook should still return 200
    console.error("Failed to record webhook event:", error);
  }
}

/**
 * In Stripe API 2025+ the billing period end moved from the subscription
 * itself to the subscription item. Fall back gracefully.
 */
function getPeriodEnd(subscription: Stripe.Subscription): number {
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number };
  if (typeof item?.current_period_end === "number") {
    return item.current_period_end;
  }
  const sub = subscription as unknown as { current_period_end?: number };
  return sub.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}
