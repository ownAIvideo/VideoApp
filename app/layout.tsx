import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { currentUser, isAdmin } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Visora — clipuri AI cu tine în rolul principal",
  description: "Încarcă-ți fotografia, alege un șablon, descrie scena și primește un clip video generat cu AI.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="ro">
      <body>
        <header className="nav">
          <div className="wrap">
            <Link href="/" className="brand">Visora</Link>
            <Link href="/pricing">Prețuri</Link>
            {user && <Link href="/create">Creează</Link>}
            <span className="sp" />
            {user ? (
              <>
                <Link href="/dashboard">Clipurile mele</Link>
                <Link href="/profile">Profil</Link>
                {isAdmin(user.email) && <Link href="/admin">Admin</Link>}
                <form action={logout}><button className="btn ghost">Ieșire</button></form>
              </>
            ) : (
              <>
                <Link href="/login">Intră în cont</Link>
                <Link href="/signup" className="btn">Începe gratuit</Link>
              </>
            )}
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer>
          <div className="wrap">
            Toate clipurile sunt generate cu AI și marcate ca atare. Doar 18+. Folosirea feței altei persoane fără acordul ei este interzisă.{" "}
            <Link href="/terms">Termeni și politica de conținut</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
