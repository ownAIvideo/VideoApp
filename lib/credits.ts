import { db } from "./db";
import { PLANS, type PlanId } from "./plans";

// Reîncarcă creditele lunar pentru abonații activi (verificat leneș, la fiecare utilizare).
export async function refreshCredits(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const plan = PLANS[(u.plan as PlanId) ?? "free"];
  const now = new Date();
  if (u.plan !== "free" && u.subStatus === "active" && (!u.creditsResetAt || u.creditsResetAt < now)) {
    const next = new Date(now); next.setMonth(next.getMonth() + 1);
    return db.user.update({ where: { id: userId }, data: { credits: plan.monthlyCredits, creditsResetAt: next } });
  }
  return u;
}

// Scade atomic un credit; întoarce false dacă nu mai are.
export async function spendCredit(userId: string) {
  const r = await db.user.updateMany({ where: { id: userId, credits: { gt: 0 } }, data: { credits: { decrement: 1 } } });
  return r.count === 1;
}

export async function refundCredit(userId: string) {
  await db.user.update({ where: { id: userId }, data: { credits: { increment: 1 } } });
}
