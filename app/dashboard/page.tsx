import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshCredits } from "@/lib/credits";
import { PLANS, type PlanId } from "@/lib/plans";
import { templateById } from "@/lib/templates";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { processing: "Se generează", succeeded: "Gata", failed: "Eșuat", blocked: "Respins", queued: "În coadă" };

export default async function Dashboard() {
  const u = await currentUser();
  if (!u) redirect("/login?next=/dashboard");
  const user = await refreshCredits(u.id);
  const videos = await db.video.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <h1>Salut, {user.name}</h1>
      <div className="grid">
        <div className="card"><span className="muted small">Plan</span><div className="price">{PLANS[user.plan as PlanId].name}</div></div>
        <div className="card"><span className="muted small">Credite rămase</span><div className="price">{user.credits}</div></div>
        <div className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/create" className="btn">+ Clip nou</Link>
          {user.stripeCustomerId
            ? <form action="/api/stripe/portal" method="post"><button className="btn ghost">Facturare</button></form>
            : <Link href="/pricing" className="btn ghost">Upgrade</Link>}
        </div>
      </div>
      {!user.selfiePath && <p className="msg-err">Încarcă fotografia ta în <Link href="/profile">Profil</Link> ca să poți genera.</p>}
      <h2>Clipurile mele</h2>
      {videos.length === 0 ? <p className="muted">Niciun clip încă.</p> : (
        <table>
          <thead><tr><th>Șablon</th><th>Titlu</th><th>Stare</th><th>Data</th></tr></thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id}>
                <td>{templateById(v.templateId)?.title}</td>
                <td><Link href={`/videos/${v.id}`}>{(JSON.parse(v.script).title as string) || v.sceneInput.slice(0, 40)}</Link></td>
                <td>{LABEL[v.status] ?? v.status}</td>
                <td>{v.createdAt.toLocaleDateString("ro-RO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
