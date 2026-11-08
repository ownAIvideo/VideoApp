# Visora — clipuri video AI cu tine în rolul principal

Aplicație cu abonament lunar: utilizatorul își încarcă fotografia, alege un șablon, descrie scena,
Claude scrie scenariul cadru cu cadru, iar un model image-to-video generează clipul.

## Ce face
- **Cont 18+** (data nașterii verificată la înregistrare), acceptare termeni.
- **Fotografia ta** — doar a ta, privată (servită numai proprietarului).
- **Duet cu consimțământ**: nu poți încărca poza altcuiva. Inviți partenerul pe email → își face cont,
  își încarcă singur poza și apasă „Accept”. Oricare dintre voi poate retrage acordul oricând.
- **Șabloane** (`lib/templates.ts`): călătorie, dans, cină, supererou, basm, videoclip muzical*, sci-fi* (*Pro).
- **Scenariu cu Claude** (`lib/script.ts`): output structurat + politică de conținut (fără nuditate/sex,
  minori, persoane publice, scene care pot trece drept înregistrări reale). Cererile respinse nu consumă credite.
- **Generare video** (`lib/video.ts`): `mock` pentru dezvoltare, `replicate` pentru producție.
- **Abonamente Stripe**: Gratuit / Basic 9 € / Pro 29 € — checkout, portal de facturare, webhook care
  setează planul și reîncarcă creditele lunar.
- **Galerie publică**: administratorul (`ADMIN_EMAIL`) publică din `/admin` clipuri generate AI, cu unealta afișată.

## Pornire locală
```bash
cp .env.example .env      # completează cheile
npm install
npx prisma db push
npm run dev               # http://localhost:3000
```
Cu `VIDEO_PROVIDER=mock` poți testa tot fluxul fără costuri video (ai nevoie doar de `ANTHROPIC_API_KEY`).

## Stripe
1. Creează 2 produse cu preț **recurent lunar** → pune `price_...` în `STRIPE_PRICE_BASIC` / `STRIPE_PRICE_PRO`.
2. Webhook către `/api/stripe/webhook` cu evenimentele `customer.subscription.created|updated|deleted` și `invoice.paid`.
   Local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Activează Customer Portal în dashboard-ul Stripe.

## Generatorul video
Recomandat: **fal.ai** (`VIDEO_PROVIDER=fal`, `FAL_KEY=...`). Fiecare clip trece prin 2 pași:
1. `FAL_IMAGE_MODEL` (implicit `fal-ai/nano-banana/edit`) compune primul cadru 9:16 fotorealist din selfie-ul
   utilizatorului (și al partenerului care și-a dat acordul) + scena.
2. `FAL_VIDEO_MODEL` (implicit `fal-ai/veo3.1/lite/image-to-video`) animează cadrul, cu sunet și replică
   rostită, sincronizată pe buze. Claude include replica în prompt.

Cost estimativ pe un clip de 8 s, 720p, cu sunet (prețuri fal din nov. 2026, verifică-le pe fal.ai/pricing):
| Model video | ~$/s | Clip 8 s |
|---|---|---|
| Veo 3.1 Lite (implicit) | 0,05 | ~0,40 $ |
| Kling 3 Pro | 0,168 | ~1,35 $ |
| Veo 3.1 (complet) | 0,40 | ~3,20 $ |

Se adaugă ~0,04 $ pentru cadrul compus. La planul Pro (80 clipuri) cu Veo Lite costul e ~35 $/lună, deci peste
prețul de 29 €: ajustează creditele sau prețul înainte de lansare.

`replicate` rămâne disponibil ca alternativă; ajustează `mapInput()` din `lib/video.ts` după modelul ales.

## Înainte de lansare (obligatoriu)
- **Stocare**: `storage/` local → S3/R2 privat + URL-uri semnate (fotografiile sunt date biometrice — GDPR art. 9).
- **Postgres** în loc de SQLite (schimbă `provider` în `prisma/schema.prisma`).
- **Email** pentru invitații (Resend/Postmark) — acum linkul se copiază manual.
- **Verificare că selfie-ul e al utilizatorului** (liveness / potrivire facială, ex. AWS Rekognition, Persona).
  Bifa de confirmare singură nu oprește pe cineva care urcă poza altcuiva.
- **Watermark/etichetă AI vizibilă + metadate C2PA** pe clipuri (AI Act art. 50, aplicabil din aug. 2026).
- **Moderarea output-ului** (nu doar a promptului) și un buton de raportare/ștergere pentru persoanele care apar în clipuri.
- Termeni și politică de confidențialitate revizuite de un avocat; verifică politica Stripe privind conținutul.
