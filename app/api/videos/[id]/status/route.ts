import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { videoProvider } from "@/lib/video";
import { refundCredit } from "@/lib/credits";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const v = await db.video.findFirst({ where: { id: (await params).id, userId: user.id } });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (v.status === "processing" && v.providerJob) {
    const s = await videoProvider.check(v.providerJob);
    if (s.status !== "processing") {
      const updated = await db.video.update({
        where: { id: v.id },
        data: { status: s.status, outputUrl: s.outputUrl ?? null, error: s.error ?? null },
      });
      if (s.status === "failed") await refundCredit(user.id);
      return NextResponse.json({ status: updated.status, outputUrl: updated.outputUrl, error: updated.error });
    }
  }
  return NextResponse.json({ status: v.status, outputUrl: v.outputUrl, error: v.error });
}
