import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshCredits } from "@/lib/credits";
import { PLANS, type PlanId } from "@/lib/plans";
import { TEMPLATES } from "@/lib/templates";
import { ActionForm } from "../Form";
import { generateVideo } from "../actions";

export const dynamic = "force-dynamic";

export default async function Create() {
  const u = await currentUser();
  if (!u) redirect("/login?next=/create");
  const user = await refreshCredits(u.id);
  const plan = PLANS[user.plan as PlanId];
  const partners = await db.likenessConsent.findMany({ where: { granteeId: user.id, status: "active" }, include: { grantor: true } });

  if (!user.selfiePath) return <><h1>Încă un pas</h1><p>Încarcă fotografia ta în <Link href="/profile">Profil</Link>.</p></>;

  return (
    <>
      <h1>Clip nou</h1>
      <p className="muted">Credite: <b>{user.credits}</b> · durată maximă {plan.maxSeconds}s{user.credits === 0 && <> · <Link href="/pricing">Fă upgrade</Link></>}</p>
      <ActionForm action={generateVideo} submit="Generează clipul (1 credit)" className="stack" >
        <b>1. Alege șablonul</b>
        <div className="grid" style={{ maxWidth: 1080 }}>
          {TEMPLATES.map((t, i) => {
            const locked = t.proOnly && user.plan !== "pro";
            return (
              <label key={t.id} className="tpl" style={{ position: "relative", opacity: locked ? 0.45 : 1 }}>
                <input type="radio" name="templateId" value={t.id} defaultChecked={i === 0} disabled={locked} />
                <div className="card">
                  <div style={{ fontSize: 28 }}>{t.emoji}</div>
                  <b style={{ color: "var(--text)" }}>{t.title}</b> {t.proOnly && <span className="badge">Pro</span>} {t.duo && <span className="badge">Duet</span>}
                  <p className="small">{t.description}</p>
                </div>
              </label>
            );
          })}
        </div>
        <b>2. Descrie scena</b>
        <label>Ce se întâmplă, unde, ce atmosferă?
          <textarea name="scene" maxLength={1200} required placeholder="Ex.: Ne plimbăm pe o stradă din Roma la apus, râdem și ne ținem de mână, apoi ne oprim lângă o fântână." /></label>
        <label>Durată
          <select name="seconds" defaultValue="5">
            {[5, 8, 10].filter((s) => s <= plan.maxSeconds).map((s) => <option key={s} value={s}>{s} secunde</option>)}
          </select></label>
        <b>3. Cu cine? (opțional, doar pentru șabloanele Duet)</b>
        <label>
          <select name="consentId" defaultValue="">
            <option value="">Doar eu</option>
            {partners.map((p) => <option key={p.id} value={p.id}>Cu {p.grantor?.name}</option>)}
          </select>
          <span className="small">Lipsește cineva? <Link href="/profile">Invită-l</Link> — trebuie să accepte el însuși.</span>
        </label>
      </ActionForm>
    </>
  );
}
