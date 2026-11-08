import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Stocare locală simplă. În producție înlocuiește cu S3/R2 (fișiere private + URL-uri semnate).
const ROOT = path.join(process.cwd(), "storage");
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VID = ["video/mp4", "video/webm"];

export async function saveUpload(file: File, kind: "image" | "video", maxMb: number) {
  const allowed = kind === "image" ? ALLOWED_IMG : ALLOWED_VID;
  if (!allowed.includes(file.type)) throw new Error(`Tip de fișier nepermis: ${file.type}`);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`Fișier prea mare (max ${maxMb} MB)`);
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const rel = path.join(kind, `${crypto.randomUUID()}.${ext}`);
  await mkdir(path.join(ROOT, kind), { recursive: true });
  await writeFile(path.join(ROOT, rel), Buffer.from(await file.arrayBuffer()));
  return rel;
}

export async function readStored(rel: string) {
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Cale invalidă");
  return readFile(full);
}

export async function asDataUrl(rel: string) {
  const buf = await readStored(rel);
  const ext = path.extname(rel).slice(1);
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buf.toString("base64")}`;
}
