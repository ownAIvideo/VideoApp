export type PlanId = "free" | "basic" | "pro";

export const PLANS: Record<PlanId, {
  name: string; priceEur: number; monthlyCredits: number; maxSeconds: number; hd: boolean; features: string[];
}> = {
  free:  { name: "Gratuit", priceEur: 0,  monthlyCredits: 1,  maxSeconds: 5,  hd: false,
           features: ["1 video de probă", "Șabloane de bază", "Clipuri de 5 secunde"] },
  basic: { name: "Basic",   priceEur: 9,  monthlyCredits: 20, maxSeconds: 8,  hd: false,
           features: ["20 videoclipuri / lună", "Clipuri de până la 8 secunde", "Duet cu persoană invitată"] },
  pro:   { name: "Pro",     priceEur: 29, monthlyCredits: 80, maxSeconds: 10, hd: true,
           features: ["80 videoclipuri / lună", "HD, până la 10 secunde", "Șabloane Pro (videoclip muzical, sci-fi)", "Duet cu persoană invitată"] },
};

export function priceIdFor(plan: PlanId) {
  if (plan === "basic") return process.env.STRIPE_PRICE_BASIC;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
  return undefined;
}

export function planFromPriceId(priceId: string | undefined | null): PlanId {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_BASIC) return "basic";
  return "free";
}
