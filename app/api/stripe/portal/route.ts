import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const user = await currentUser();
  const app = process.env.APP_URL!;
  if (!user?.stripeCustomerId) return NextResponse.redirect(`${app}/pricing`, 303);
  const s = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${app}/dashboard` });
  return NextResponse.redirect(s.url, 303);
}
