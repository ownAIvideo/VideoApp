import { currentUser } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/plans";

export default async function Pricing() {
  const user = await currentUser();
  return (
    <>
      <h1>Abonamente</h1>
      <p className="muted">Plătești lunar, anulezi oricând. Cererile respinse sau eșuate nu consumă credite.</p>
      <div className="grid">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          return (
            <div key={id} className="card" style={id === "pro" ? { borderColor: "var(--accent)" } : undefined}>
              <b>{p.name}</b>
              <div className="price">{p.priceEur} €<span className="muted small"> / lună</span></div>
              <ul className="f">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {id === "free" ? <span className="muted small">Inclus la înregistrare</span>
                : user?.plan === id ? <span className="badge">Planul tău</span>
                : <form action="/api/stripe/checkout" method="post"><input type="hidden" name="plan" value={id} /><button className="btn">Alege {p.name}</button></form>}
            </div>
          );
        })}
      </div>
    </>
  );
}
