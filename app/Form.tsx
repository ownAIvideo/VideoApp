"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? "Se procesează…" : label}</button>;
}

export function ActionForm({
  action, submit, children, className = "stack",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submit: string; children: React.ReactNode; className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="msg-err">{state.error}</p>}
      {state?.ok && <p className="msg-ok">{state.ok}</p>}
      <div><Submit label={submit} /></div>
    </form>
  );
}
