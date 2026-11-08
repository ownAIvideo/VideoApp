import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { PLANS, planFromPriceId } from "@/lib/plans";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const active = sub.status === "active" || sub.status === "trialing";
      const plan = active ? planFromPriceId(sub.items.data[0]?.price.id) : "free";
      await db.user.updateMany({
        where: { stripeCustomerId: customer },
        data: { plan, stripeSubId: sub.id, subStatus: active ? "active" : sub.status },
      });
      break;
    }
    case "invoice.paid": {
      // Fiecare lună plătită reîncarcă creditele
      const inv = event.data.object as Stripe.Invoice;
      const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      if (!customer) break;
      const user = await db.user.findUnique({ where: { stripeCustomerId: customer } });
      if (!user || user.plan === "free") break;
      const next = new Date(); next.setMonth(next.getMonth() + 1);
      await db.user.update({
        where: { id: user.id },
        data: { credits: PLANS[user.plan as keyof typeof PLANS].monthlyCredits, creditsResetAt: next, subStatus: "active" },
      });
      break;
    }
  }
  return NextResponse.json({ received: true });
}
