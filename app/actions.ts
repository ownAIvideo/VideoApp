"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ageFrom, createSession, destroySession, isAdmin, requireUser } from "@/lib/auth";
import { saveUpload, asDataUrl } from "@/lib/storage";
import { templateById } from "@/lib/templates";
import { PLANS, type PlanId } from "@/lib/plans";
import { quickScreen } from "@/lib/safety";
import { writeScript } from "@/lib/script";
import { videoProvider } from "@/lib/video";
import { refreshCredits, spendCredit, refundCredit } from "@/lib/credits";

export type FormState = { error?: string; ok?: string } | undefined;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const safePath = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? p : "");

// ——— Cont
export async function signup(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  const name = str(f, "name");
  const birth = new Date(str(f, "birthDate"));
  if (!email.includes("@") || password.length < 8 || !name) return { error: "Completează toate câmpurile (parola min. 8 caractere)." };
  if (isNaN(birth.getTime()) || ageFrom(birth) < 18) return { error: "Aplicația este doar pentru persoane de peste 18 ani." };
  if (f.get("terms") !== "on") return { error: "Trebuie să accepți termenii și politica de conținut." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Există deja un cont cu acest email." };
  const user = await db.user.create({
    data: { email, name, birthDate: birth, passwordHash: await bcrypt.hash(password, 12) },
  });
  await createSession(user.id);
  redirect(safePath(str(f, "next")) || "/dashboard");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const user = await db.user.findUnique({ where: { email: str(f, "email").toLowerCase() } });
  if (!user || !(await bcrypt.compare(str(f, "password"), user.passwordHash))) return { error: "Email sau parolă greșită." };
  await createSession(user.id);
  redirect(safePath(str(f, "next")) || "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ——— Fața ta (doar a ta)
export async function uploadSelfie(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  if (f.get("own") !== "on") return { error: "Confirmă că fotografia este cu tine." };
  const file = f.get("selfie");
  if (!(file instanceof File) || file.size === 0) return { error: "Alege o fotografie." };
  try {
    const rel = await saveUpload(file, "image", 8);
    await db.user.update({ where: { id: user.id }, data: { selfiePath: rel, selfieConsentAt: new Date() } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/profile");
  return { ok: "Fotografia a fost salvată." };
}

// ——— Persoana invitată: NU încarci tu poza altcuiva. O inviți, iar ea își încarcă singură poza și aprobă.
export async function invitePartner(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const inviteEmail = str(f, "email").toLowerCase();
  if (!inviteEmail.includes("@") || inviteEmail === user.email) return { error: "Email invalid." };
  const token = crypto.randomBytes(24).toString("base64url");
  await db.likenessConsent.create({ data: { granteeId: user.id, inviteEmail, token } });
  revalidatePath("/profile");
  // TODO: trimite emailul (Resend/Postmark). Până atunci, linkul se copiază manual.
  return { ok: `Invitație creată. Trimite-i linkul: ${process.env.APP_URL}/consent/${token}` };
}

export async function decideConsent(token: string, accept: boolean) {
  const user = await requireUser();
  const c = await db.likenessConsent.findUnique({ where: { token } });
  if (!c || c.status !== "pending") throw new Error("Invitație invalidă sau deja folosită.");
  if (c.inviteEmail !== user.email) throw new Error("Invitația a fost trimisă pe alt email.");
  if (c.granteeId === user.id) throw new Error("Nu îți poți trimite singur invitație.");
  if (accept && !user.selfiePath) redirect(`/profile?next=/consent/${token}`);
  await db.likenessConsent.update({
    where: { token },
    data: { status: accept ? "active" : "declined", grantorId: user.id, decidedAt: new Date() },
  });
  redirect("/profile");
}

export async function revokeConsent(id: string) {
  const user = await requireUser();
  // oricare dintre cei doi poate opri folosirea
  await db.likenessConsent.updateMany({
    where: { id, OR: [{ grantorId: user.id }, { granteeId: user.id }] },
    data: { status: "revoked", decidedAt: new Date() },
  });
  revalidatePath("/profile");
}

// ——— Generare
export async function generateVideo(_: FormState, f: FormData): Promise<FormState> {
  const u0 = await requireUser();
  const user = await refreshCredits(u0.id);
  const plan = PLANS[user.plan as PlanId];
  const template = templateById(str(f, "templateId"));
  const scene = str(f, "scene").slice(0, 1200);
  const seconds = Math.min(Number(str(f, "seconds")) || 5, plan.maxSeconds);
  const consentId = str(f, "consentId") || null;

  if (!template) return { error: "Alege un șablon." };
  if (template.proOnly && user.plan !== "pro") return { error: "Șablonul este disponibil doar în planul Pro." };
  if (!user.selfiePath) return { error: "Încarcă mai întâi fotografia ta în Profil." };
  if (scene.length < 10) return { error: "Descrie scena în câteva cuvinte (min. 10 caractere)." };
  const blocked = quickScreen(scene);
  if (blocked) return { error: blocked };

  const faces = [await asDataUrl(user.selfiePath)];
  if (consentId) {
    if (!template.duo) return { error: "Acest șablon este pentru o singură persoană." };
    const c = await db.likenessConsent.findFirst({
      where: { id: consentId, granteeId: user.id, status: "active" }, include: { grantor: true },
    });
    if (!c?.grantor?.selfiePath) return { error: "Persoana aleasă nu și-a dat (sau și-a retras) acordul." };
    faces.push(await asDataUrl(c.grantor.selfiePath));
  }

  if (!(await spendCredit(user.id))) return { error: "Nu mai ai credite. Fă upgrade la un abonament." };

  let script;
  try {
    script = await writeScript({ template, scene, seconds, duo: faces.length > 1 });
  } catch (e) {
    await refundCredit(user.id);
    return { error: (e as Error).message };
  }
  if (!script.allowed) {
    await refundCredit(user.id);
    await db.video.create({
      data: { userId: user.id, templateId: template.id, sceneInput: scene, script: JSON.stringify(script), status: "blocked", error: script.refusalReason, consentId },
    });
    return { error: `Cerere respinsă: ${script.refusalReason}` };
  }

  const video = await db.video.create({
    data: { userId: user.id, templateId: template.id, sceneInput: scene, script: JSON.stringify(script), status: "processing", consentId },
  });
  try {
    const job = await videoProvider.start({
      prompt: `${script.videoPrompt}. Style: ${template.style}`,
      negativePrompt: script.negativePrompt,
      seconds, hd: plan.hd, faceImages: faces,
    });
    await db.video.update({ where: { id: video.id }, data: { providerJob: job } });
  } catch (e) {
    await refundCredit(user.id);
    await db.video.update({ where: { id: video.id }, data: { status: "failed", error: (e as Error).message } });
  }
  redirect(`/videos/${video.id}`);
}

// ——— Admin: publici clipuri AI în galeria publică
export async function uploadShowcase(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!isAdmin(user.email)) return { error: "Doar administratorul poate publica." };
  if (f.get("aiAttest") !== "on") return { error: "Confirmă că videoclipul este generat integral cu AI și că ai drepturile asupra lui." };
  const file = f.get("file");
  const title = str(f, "title"), aiTool = str(f, "aiTool");
  if (!(file instanceof File) || file.size === 0 || !title || !aiTool) return { error: "Completează titlul, unealta AI și fișierul." };
  try {
    const rel = await saveUpload(file, "video", 200);
    await db.showcaseVideo.create({ data: { title, aiTool, description: str(f, "description"), filePath: rel } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/");
  return { ok: "Publicat." };
}
