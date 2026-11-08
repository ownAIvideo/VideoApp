import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { priceIdFor, type PlanId } from "@/lib/plans";

export async function POST(req: Request) {
  const user = await currentUser();
  const app = process.env.APP_URL!;
  if (!user) return NextResponse.redirect(`${app}/login?next=/pricing`, 303);
  const plan = String((await req.formData()).get("plan")) as PlanId;
  const price = priceIdFor(plan);
  if (!price) return NextResponse.json({ error: "Plan invalid sau STRIPE_PRICE_* lipsă" }, { status: 400 });

  let customer = user.stripeCustomerId;
  if (!customer) {
    customer = (await stripe().customers.create({ email: user.email, metadata: { userId: user.id } })).id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer } });
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    allow_promotion_codes: true,
    success_url: `${app}/dashboard?subscribed=1`,
    cancel_url: `${app}/pricing`,
  });
  return NextResponse.redirect(session.url!, 303);
}
