import Link from "next/link";
import { db } from "@/lib/db";
import { TEMPLATES } from "@/lib/templates";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function Home() {
  const showcase = await db.showcaseVideo.findMany({ orderBy: { createdAt: "desc" }, take: 9 });
  return (
    <>
      <section className="hero">
        <span className="badge">100% generat cu AI</span>
        <h1>Tu, în rolul principal.<br />Orice scenă îți imaginezi.</h1>
        <p className="muted" style={{ maxWidth: 620 }}>
          Încarcă o fotografie cu tine, alege un șablon, descrie scena — AI-ul scrie scenariul și generează clipul.
          Vrei să apară și partenerul? Îl inviți, iar el își dă singur acordul.
        </p>
        <Link href="/signup" className="btn">Creează primul clip gratuit</Link>
      </section>

      <h2>Cum funcționează</h2>
      <div className="grid">
        {[
          ["1. Fotografia ta", "Un selfie clar, cu fața ta. Doar tu îl vezi."],
          ["2. Alege șablonul", "Călătorie, dans, basm, supererou, sci-fi…"],
          ["3. Descrie scena", "Câteva cuvinte. Claude scrie scenariul cadru cu cadru."],
          ["4. Primești clipul", "Video AI de 5–10 secunde, gata de distribuit."],
        ].map(([t, d]) => <div key={t} className="card"><b>{t}</b><p className="muted small">{d}</p></div>)}
      </div>

      {showcase.length > 0 && (
        <>
          <h2>Galerie</h2>
          <div className="grid">
            {showcase.map((v) => (
              <div key={v.id} className="card">
                <video src={`/api/files/${v.filePath}`} controls preload="metadata" playsInline />
                <b>{v.title}</b>
                <p className="muted small">{v.description}</p>
                <span className="badge">Generat cu AI · {v.aiTool}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Șabloane</h2>
      <div className="grid">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="card">
            <div style={{ fontSize: 30 }}>{t.emoji}</div>
            <b>{t.title}</b> {t.proOnly && <span className="badge">Pro</span>} {t.duo && <span className="badge">Duet</span>}
            <p className="muted small">{t.description}</p>
          </div>
        ))}
      </div>

      <h2>Abonamente</h2>
      <p className="muted">De la {PLANS.basic.priceEur} €/lună. <Link href="/pricing">Vezi planurile →</Link></p>
    </>
  );
}
