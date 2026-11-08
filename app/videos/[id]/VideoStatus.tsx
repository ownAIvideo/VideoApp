"use client";

import { useEffect, useState } from "react";

type S = { status: string; outputUrl: string | null; error: string | null };

export function VideoStatus({ id, initial }: { id: string; initial: S }) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    if (s.status !== "processing") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/videos/${id}/status`);
      if (r.ok) setS(await r.json());
    }, 4000);
    return () => clearInterval(t);
  }, [id, s.status]);

  if (s.status === "succeeded" && s.outputUrl)
    return (<>
      <video src={s.outputUrl} controls autoPlay loop playsInline />
      <p className="small muted">Generat cu AI. Marchează-l ca atare când îl distribui.</p>
      <a className="btn" href={s.outputUrl} download>Descarcă</a>
    </>);
  if (s.status === "processing") return <p>⏳ Se generează… durează de obicei 1–3 minute. Poți închide pagina.</p>;
  return <p className="msg-err">{s.status === "blocked" ? "Cerere respinsă" : "Generarea a eșuat"}: {s.error} (creditul a fost returnat)</p>;
}
