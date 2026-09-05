import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer, getSessionUser } from "@/lib/supabase/server";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

export async function POST(request: Request) {
  if (!stripeKey) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  try {
    const { amount, description } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Stripe customer comes from the signed-in user's own profile row.
    const sb = await getSupabaseServer();
    const { data: profile } = await sb
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    const customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Create the invoice first
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: false,
      collection_method: "send",
      days_until_due: 30,
      metadata: {
        userId: user.id,
        description,
      },
    });

    // Add the line item to the invoice
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      description,
      amount,
      quantity: 1,
      currency: "usd",
    });

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Send the invoice to the customer
    await stripe.invoices.sendInvoice(finalizedInvoice.id);

    return NextResponse.json({
      invoiceId: finalizedInvoice.id,
      hostedUrl: finalizedInvoice.hosted_invoice_url,
    });
  } catch (error) {
    console.error("Stripe invoice creation error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
