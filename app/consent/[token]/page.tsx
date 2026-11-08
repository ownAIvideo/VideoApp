import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideConsent } from "../../actions";

export default async function Consent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signup?next=/consent/${token}`);
  const c = await db.likenessConsent.findUnique({ where: { token }, include: { grantee: true } });
  if (!c || c.status !== "pending") return <><h1>Invitație invalidă</h1><p className="muted">Linkul a expirat sau a fost deja folosit.</p></>;
  if (c.inviteEmail !== user.email) return <><h1>Alt cont</h1><p className="muted">Invitația a fost trimisă pe {c.inviteEmail}. Intră cu acel cont.</p></>;
  return (
    <>
      <h1>{c.grantee.name} vrea să creeze clipuri AI cu tine</h1>
      <div className="card" style={{ maxWidth: 640 }}>
        <p>Dacă accepți, <b>{c.grantee.name}</b> va putea folosi fotografia ta în clipuri generate cu AI, doar în șabloanele permise (fără nuditate sau conținut sexual).</p>
        <p className="muted small">Poți retrage acordul oricând din Profil. Clipurile noi nu vor mai putea fi create după retragere.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <form action={decideConsent.bind(null, token, true)}><button className="btn">Accept</button></form>
          <form action={decideConsent.bind(null, token, false)}><button className="btn ghost">Refuz</button></form>
        </div>
      </div>
    </>
  );
}
