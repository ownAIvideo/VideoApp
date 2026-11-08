import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { readStored } from "@/lib/storage";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  const ext = rel.split(".").pop() ?? "";

  // Videoclipurile din galerie sunt publice
  const isShowcase = rel.startsWith("video/") && (await db.showcaseVideo.findFirst({ where: { filePath: rel } }));
  if (!isShowcase) {
    // Fotografiile cu fețe: doar proprietarul le vede
    const user = await currentUser();
    if (!user || user.selfiePath !== rel) return new NextResponse("Not found", { status: 404 });
  }
  try {
    const buf = await readStored(rel);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=300" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
