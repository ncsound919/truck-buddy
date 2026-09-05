import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer, getSessionUser } from "@/lib/supabase/server";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";

export async function GET(request: Request) {
  if (!stripeKey) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Stripe customer id lives on the server-side profile row (service data,
    // not browser metadata).
    const sb = await getSupabaseServer();
    const { data: profile } = await sb
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    const customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json([]);
    }

    // List invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    // Transform to our format
    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_due,
      currency: inv.currency,
      status: inv.status as "paid" | "open" | "void",
      created: new Date(inv.created * 1000).toISOString(),
      dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : undefined,
      hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
      lines: inv.lines.data.map((line) => ({
        description: line.description || "Subscription",
        quantity: line.quantity || 1,
        amount: line.amount,
      })),
    }));

    return NextResponse.json(formattedInvoices);
  } catch (error) {
    console.error("Stripe invoices list error:", error);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }
}
