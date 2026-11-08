import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Script } from "@/lib/script";
import { templateById } from "@/lib/templates";
import { VideoStatus } from "./VideoStatus";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const v = await db.video.findFirst({ where: { id: (await params).id, userId: user.id } });
  if (!v) notFound();
  const s = JSON.parse(v.script) as Script;
  return (
    <>
      <span className="badge">{templateById(v.templateId)?.title}</span>
      <h1>{s.title || "Clip"}</h1>
      <p className="muted">{s.logline}</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="card"><VideoStatus id={v.id} initial={{ status: v.status, outputUrl: v.outputUrl, error: v.error }} /></div>
        <div className="card">
          <b>Scenariu</b>
          <ol className="small">{s.shots.map((sh, i) => <li key={i}><b>{sh.seconds}s</b> · {sh.camera} — {sh.action}</li>)}</ol>
          <details className="small muted"><summary>Prompt video</summary>{s.videoPrompt}</details>
        </div>
      </div>
    </>
  );
}
