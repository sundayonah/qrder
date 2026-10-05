# Qrder

Scan a table QR → order (menu or plain language with open AI) → kitchen phone buzzes. Built for a friend’s restaurant.

## Stack

- Next.js + TypeScript + Tailwind
- MongoDB Atlas (optional locally — in-memory fallback)
- Open-model order parsing via Groq-compatible API (heuristic fallback)
- Deploy: Vercel

## Quick start

```bash
cd qrder
pnpm install
cp .env.example .env.local
pnpm dev
```

Open:

- http://localhost:3000 — home
- http://localhost:3000/setup — print table QR codes
- http://localhost:3000/t/1 — guest table
- http://localhost:3000/kitchen — staff board (tap **Enable buzz + sound**)

## Demo flow

1. Open `/kitchen` on your friend’s phone → enable buzz
2. Open `/t/3` (or scan a QR from `/setup`)
3. Order from the menu **or** type “jollof for 2 and zobo” → **Understand with AI** → send
4. Tap **Call staff** — kitchen should buzz / beep with table number

## MongoDB

Set `MONGODB_URI` in `.env.local` (Atlas connection string). Without it, orders live in memory (fine for local demo; resets on server restart).

## AI

Set `AI_API_KEY` (or `GROQ_API_KEY`) for open-model parsing. Without a key, a local keyword matcher still maps common dish names.

## Design

White background, black buttons, `cursor-pointer` on controls.
