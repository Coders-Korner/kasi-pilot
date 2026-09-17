# TradePulse

**A WhatsApp-style trading companion that turns a spaza shop's daily sales into a bankable business record.**

TradePulse is a mobile-first, installable PWA for South African township and spaza traders. Traders record sales, purchases and stock in plain language over a chat interface (typed or voice). TradePulse extracts structured transactions, keeps an offline-first ledger, and produces a **Readiness Passport** that distributors and funders can review with the trader's explicit consent.

Built for the annual hackathon. All four roles are demoable end to end on seeded data.

---

## The problem

Most spaza and township traders run profitable businesses but have no formal record of it. Sales happen in cash, stock is tracked in memory, and there is no evidence trail a bank or distributor can trust. Without data, there is no credit, no better pricing, and no growth.

TradePulse meets traders where they already are — a familiar chat — and quietly builds the financial record behind the scenes.

## What it does

**Trader (chat-first)**
- Record sales/purchases in natural language: `Sold 4 kotas at R35 each`, `I bought 12 bread at R12 each`.
- Voice input via the Web Speech API (server-side Whisper path available when an OpenAI key is set).
- Ambiguous entries are held as **pending** and confirmed or corrected with one tap.
- Deterministic rule-based parser fallback so the whole demo works with **no API key**.
- Dashboard with revenue trends, top products, stock alerts and today's summary.
- Inventory management with low-stock thresholds and stock movements.
- **Readiness Passport**: consistency score, revenue history, stock value, and a downloadable PDF.

**Distributor portal**
- Sees only consented retailers, reorder/stock alerts, and can target promotions to specific stores.

**Bank / Funder portal**
- Sees only traders who consented to bank data sharing.
- Reviews the same live passport data and records loan assessments with a readiness score.

**Admin console**
- Platform-wide metrics, user list with verify/suspend controls, and a support ticket queue.

## Key design decisions

- **Offline-first PWA.** A service worker plus a Dexie-backed queue capture transactions with no connectivity and sync automatically when back online (idempotent by `localId`).
- **AI with a deterministic fallback.** OpenAI structured extraction is used when `OPENAI_API_KEY` is present; otherwise a rule-based parser handles common phrasing. The demo never depends on network or quota.
- **Data isolation by default.** Every query is scoped to the authenticated trader's `userId`. Partner portals are gated by both role-based access control and per-trader consent flags.
- **Simulated auth for the demo.** Register → OTP (returned on screen in dev) → PIN, with a signed httpOnly JWT session cookie. This mirrors the real flow without an SMS provider.

## Tech stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn-style primitives, Recharts
- Prisma ORM (SQLite for local dev, PostgreSQL/Supabase in production)
- Zustand, TanStack Query, Dexie
- jose (JWT), bcryptjs, Zod, pdfkit
- OpenAI SDK (optional), Web Speech API

## Getting started

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
npx prisma migrate deploy   # create the SQLite schema
npm run db:seed             # seed demo traders, partners and 6 months of history
npm run dev
```

Open http://localhost:3000. The app is installable as a PWA on desktop and mobile.

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite locally (`file:./dev.db?...`); swap to a Supabase/Postgres URL to deploy |
| `SESSION_SECRET` | Signs session JWTs |
| `OPENAI_API_KEY` | Optional. Empty = deterministic parser only |
| `OPENAI_MODEL` | Model used for extraction when a key is present |
| `OTP_DEV_MODE` | `1` returns the simulated OTP in the UI and API (demo only) |

To deploy on Postgres: change the provider in `prisma/schema.prisma` to `postgresql`, set `DATABASE_URL`, and run `npx prisma migrate deploy`.

## Demo accounts

The OTP is shown on screen in dev mode. Enter any value shown, then the PIN below.

| Role | Phone | PIN | Business |
| --- | --- | --- | --- |
| Trader | `+27821234567` | `1234` | Thandi's Spaza Shop |
| Trader | `+27829876543` | `1234` | John's Corner Cafe |
| Trader | `+27837654321` | `1234` | Maria's General Store |
| Distributor | `+27821110000` | `0000` | Kasi Distributors |
| Bank / Funder | `+27832220000` | `0000` | Ubuntu Bank |
| Admin | `+27840000000` | `0000` | TradePulse |

New accounts can also be created from `/register`.

## Try this in the demo

1. Log in as **Thandi** and open **Chat**. Send `Sold 4 kotas at R35 each` — the sale is recorded and stock updated. Send `I bought 12 bread at R12 each`.
2. Send something vague, e.g. `sold 6 coldrinks`, then **Confirm** or **Correct** it.
3. Open **Dashboard** for trends, then **Passport** and download the PDF.
4. Toggle a consent switch in **Settings**.
5. Log in as the **Distributor**, send a promotion, view a consented retailer.
6. Log in as the **Bank**, open a trader's passport, and save an assessment.
7. Log in as **Admin** to see platform metrics, verify a user, and update a ticket.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm run start` | Production build and serve |
| `npm run typecheck` | TypeScript with no emit |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply a migration in dev |
| `npm run db:push` | Push schema without a migration |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset the database and re-seed |

## Security posture

- Zod validation on every write endpoint.
- Role-based middleware guards for `/trader`, `/distributor`, `/bank` and `/admin`.
- Partner access requires the trader's explicit consent flag; non-consented records return `403`.
- Passwords/PINs stored as bcrypt hashes; sessions are signed httpOnly cookies.
- Audit log for auth and data-changing actions.
- An HMAC-signed inbound webhook (`x-tradepulse-signature`) simulates the WhatsApp channel.

Scope note: this is an MVP. Marketplace, payments, live credit scoring and large distributor integrations are intentionally out of scope.

## Project structure

```
src/
  app/
    api/            route handlers (auth, chat, transactions, passport, partner, admin, webhook, sync)
    trader/         chat, dashboard, inventory, passport, settings
    distributor/    overview, retailers, promotions
    bank/           pipeline, assessments, portfolio
    admin/          overview, users, tickets
  components/       UI primitives, portal shell, chat UI, offline provider
  lib/              prisma, session, auth helpers, AI extraction, transactions, passport, offline queue
prisma/
  schema.prisma     portable models (no DB enums; values validated in Zod)
  seed.ts           demo data generator
public/             manifest, service worker, icons
```

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm run build` — 47 routes compiled
- End-to-end API smoke suite: 35/35 passing across trader, distributor, bank, admin, consent isolation and the signed webhook
- All 18 page routes render `200`; wrong-role access is redirected by middleware
