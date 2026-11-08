import Link from "next/link";
import { ActionForm } from "../Form";
import { signup } from "../actions";

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "";
  return (
    <>
      <h1>Creează cont</h1>
      <ActionForm action={signup} submit="Creează cont">
        <input type="hidden" name="next" value={safeNext} />
        <label>Nume<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Parolă<input name="password" type="password" minLength={8} required /></label>
        <label>Data nașterii<input name="birthDate" type="date" required /></label>
        <label className="check"><input type="checkbox" name="terms" />
          <span>Am peste 18 ani și accept <Link href="/terms">termenii și politica de conținut</Link>.</span></label>
      </ActionForm>
      <p className="muted">Ai deja cont? <Link href={`/login${safeNext ? `?next=${safeNext}` : ""}`}>Intră</Link></p>
    </>
  );
}
