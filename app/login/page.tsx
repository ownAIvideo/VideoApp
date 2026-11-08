import { ActionForm } from "../Form";
import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "";
  return (
    <>
      <h1>Intră în cont</h1>
      <ActionForm action={login} submit="Intră">
        <input type="hidden" name="next" value={safeNext} />
        <label>Email<input name="email" type="email" required /></label>
        <label>Parolă<input name="password" type="password" required /></label>
      </ActionForm>
    </>
  );
}
