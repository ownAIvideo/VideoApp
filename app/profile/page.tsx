import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "../Form";
import { invitePartner, revokeConsent, uploadSelfie } from "../actions";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/profile");
  const { next } = await searchParams;
  const [given, received] = await Promise.all([
    db.likenessConsent.findMany({ where: { grantorId: user.id }, include: { grantee: true }, orderBy: { createdAt: "desc" } }),
    db.likenessConsent.findMany({ where: { granteeId: user.id }, include: { grantor: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <h1>Profil</h1>
      {next && <p className="msg-ok">Încarcă-ți fotografia, apoi <a href={next}>revino la invitație</a>.</p>}

      <h2>Fotografia ta</h2>
      <div className="card" style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        {user.selfiePath ? <img src={`/api/files/${user.selfiePath}`} alt="Fotografia ta" className="avatar" /> : <div className="avatar" />}
        <ActionForm action={uploadSelfie} submit="Salvează fotografia">
          <label>Selfie clar, din față, lumină bună (JPG/PNG/WebP, max 8 MB)
            <input type="file" name="selfie" accept="image/jpeg,image/png,image/webp" required /></label>
          <label className="check"><input type="checkbox" name="own" />
            <span>Confirm că persoana din fotografie sunt eu și am peste 18 ani.</span></label>
        </ActionForm>
      </div>

      <h2>Invită partenerul pentru clipuri în doi</h2>
      <p className="muted small">Nu poți încărca fotografia altcuiva. Partenerul primește un link, își face cont, își încarcă singur fotografia și aprobă. Oricare dintre voi poate retrage acordul oricând.</p>
      <div className="card">
        <ActionForm action={invitePartner} submit="Creează invitație">
          <label>Emailul partenerului<input name="email" type="email" required /></label>
        </ActionForm>
      </div>

      <h2>Persoane care te-au acceptat</h2>
      <ConsentTable rows={received.map((c) => ({ id: c.id, who: c.grantor?.name ?? c.inviteEmail, status: c.status }))} />
      <h2>Cui i-ai permis să-ți folosească fața</h2>
      <ConsentTable rows={given.map((c) => ({ id: c.id, who: c.grantee.name, status: c.status }))} />
    </>
  );
}

const ST: Record<string, string> = { pending: "În așteptare", active: "Activ", revoked: "Retras", declined: "Refuzat" };

function ConsentTable({ rows }: { rows: { id: string; who: string; status: string }[] }) {
  if (!rows.length) return <p className="muted">Nimic încă.</p>;
  return (
    <table><tbody>
      {rows.map((r) => (
        <tr key={r.id}>
          <td>{r.who}</td><td>{ST[r.status]}</td>
          <td>{(r.status === "active" || r.status === "pending") &&
            <form action={revokeConsent.bind(null, r.id)}><button className="btn ghost">Retrage</button></form>}</td>
        </tr>
      ))}
    </tbody></table>
  );
}
