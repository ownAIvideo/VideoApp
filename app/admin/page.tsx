import { notFound } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "../Form";
import { uploadShowcase } from "../actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await currentUser();
  if (!user || !isAdmin(user.email)) notFound();
  const [users, subs, videos, blocked] = await Promise.all([
    db.user.count(), db.user.count({ where: { subStatus: "active" } }),
    db.video.count({ where: { status: "succeeded" } }), db.video.count({ where: { status: "blocked" } }),
  ]);
  return (
    <>
      <h1>Admin</h1>
      <div className="grid">
        {[["Utilizatori", users], ["Abonați activi", subs], ["Clipuri generate", videos], ["Cereri respinse", blocked]].map(([k, v]) =>
          <div key={k} className="card"><span className="muted small">{k}</span><div className="price">{v}</div></div>)}
      </div>
      <h2>Publică un clip în galerie</h2>
      <ActionForm action={uploadShowcase} submit="Publică">
        <label>Titlu<input name="title" required /></label>
        <label>Descriere<textarea name="description" /></label>
        <label>Unealta AI folosită<input name="aiTool" required placeholder="ex. Veo, Kling, Runway…" /></label>
        <label>Fișier (MP4/WebM, max 200 MB)<input type="file" name="file" accept="video/mp4,video/webm" required /></label>
        <label className="check"><input type="checkbox" name="aiAttest" />
          <span>Confirm că videoclipul e generat integral cu AI, am drepturile asupra lui și orice persoană recognoscibilă și-a dat acordul.</span></label>
      </ActionForm>
    </>
  );
}
