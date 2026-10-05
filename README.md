# Qrder

Scan a table QR → order by menu or voice (open-weight AI) → kitchen phone buzzes. Built for a friend’s restaurant.

## Stack

- Next.js + TypeScript + Tailwind
- MongoDB Atlas (optional locally — in-memory fallback)
- Open-model order parsing via Groq-compatible API (`gpt-oss` / Llama; heuristic fallback)
- Whisper STT (Groq) for voice orders
- ElevenLabs TTS to read the order back and ask yes/no (browser speech fallback)
- Deploy: Vercel

## Quick start

```bash
cd qrder
pnpm install
cp .env.example .env.local
# fill AI_API_KEY, ADMIN_*, APP_URL, optional MONGODB_URI / ELEVENLABS_*
pnpm dev
```

Open:

- http://localhost:3000 — guest menu + cart + mic (`?table=3` for a table)
- http://localhost:3000/t/1 — redirects to `/?table=1`
- http://localhost:3000/admin — kitchen board (login required; tap **Enable buzz**)
- http://localhost:3000/admin/login — staff login
- http://localhost:3000/setup — table QR codes (also shown in admin)

Set `APP_URL` / `NEXT_PUBLIC_APP_URL` to your public URL (ngrok or Vercel) so QR codes point at the right host.

## Demo flow

1. Open `/admin` on your friend’s phone → log in → tap **Enable buzz**
2. Open `/?table=3` (or scan a QR from admin / `/setup`)
3. Tap dishes into the cart, **or** tap the mic and say e.g. “two jollof and a zobo”
4. AI parses the order; voice reads it back and asks if that’s correct
5. Say **yes** → order is sent to the kitchen with the table number  
   Say **no** → “Please order again” and you can speak again
6. Use **Need help?** → **Buzz** to alert staff for that table

## MongoDB

Set `MONGODB_URI` in `.env.local`. Without it, orders live in memory (fine for local demo; resets on server restart).

## AI & voice

- `AI_API_KEY` (or `GROQ_API_KEY`) — open-model parsing + Whisper. Without a key, a local keyword matcher still maps common dish names.
- `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` — talk-back confirmation. Without them (or if the voice plan fails), the browser `speechSynthesis` API is used.

## Admin

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in `.env.local`. Do not commit real secrets — keep them in `.env.local` only.

## Design

White background, black buttons, `cursor-pointer` on controls.
