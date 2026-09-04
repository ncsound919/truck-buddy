import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

export async function POST(request: Request) {
  try {
    const { amount, description, userId } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Find or create Stripe customer for the user
    // In a real implementation, you'd look up the Stripe customer ID from your database
    const customers = await stripe.customers.list({
      email: `${userId}@truckbuddy.local`,
      limit: 1,
    });

    const customer = customers.data[0];
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Create the invoice first
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      auto_advance: false,
      collection_method: "send",
      days_until_due: 30,
      metadata: {
        userId,
        description,
      },
    });

    // Add the line item to the invoice
    await stripe.invoiceItems.create({
      customer: customer.id,
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
