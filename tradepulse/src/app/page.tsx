import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessageCircle,
  BarChart3,
  Package,
  WifiOff,
  FileCheck2,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getSession, ROLE_HOME } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Chat to record sales",
    body: "“Sold 4 kotas at R35 each.” Type it or send a voice note — TradePulse records the sale, updates stock and does the maths.",
  },
  {
    icon: Package,
    title: "Live stock on hand",
    body: "Every sale, purchase and stock-take adjusts your inventory automatically, with low-stock alerts before you run out.",
  },
  {
    icon: BarChart3,
    title: "A dashboard that makes sense",
    body: "Revenue, profit, best sellers and a weekly insight in plain language — no accounting degree required.",
  },
  {
    icon: WifiOff,
    title: "Works without data",
    body: "Capture sales offline; they sync automatically when you get signal. Built for load-shedding and spotty networks.",
  },
  {
    icon: FileCheck2,
    title: "Bankable readiness passport",
    body: "Six months of clean records become a one-page passport a bank or funder can actually assess.",
  },
  {
    icon: Building2,
    title: "Connected to your supplier",
    body: "Share consented data with your distributor for reorders and promos — you stay in control of who sees what.",
  },
];

const DEMO_ACCOUNTS = [
  { role: "Trader", phone: "+27 82 123 4567", name: "Thandi's Spaza Shop", pin: "1234" },
  { role: "Distributor", phone: "+27 82 111 0000", name: "Kasi Distributors", pin: "0000" },
  { role: "Bank / Funder", phone: "+27 83 222 0000", name: "Ubuntu Bank", pin: "0000" },
  { role: "Admin", phone: "+27 84 000 0000", name: "TradePulse", pin: "0000" },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role] || "/trader/chat");

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">TradePulse</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-8 text-center md:pt-16">
        <Badge className="mb-4">Built for spaza shops & township traders</Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Business in your pocket.
          <span className="block text-primary">In the chat you already use.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          TradePulse turns everyday sales talk into clean records — stock on hand, profit, best
          sellers and a bankable trading history. No paperwork, no admin, no data needed.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Start recording free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Try a demo account
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Installable PWA • Works offline • No bank details required
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-6">
        <div className="grid items-center gap-10 rounded-3xl border bg-card/60 p-6 md:p-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl font-bold md:text-3xl">See it happen in the chat.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A normal sentence becomes a sale, stock update and record. No forms, no spreadsheets
              and no training needed.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "“Sold 4 kotas at R35 each” updates revenue and stock instantly",
                "Ask anything in the chat — prices, low stock, best sellers",
                "After a few months, the same records become a readiness passport",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 flex flex-col items-center gap-6 lg:order-2">
            <div
              role="img"
              aria-label="Example TradePulse chat that turns a sale message into a recorded transaction"
              className="w-full max-w-[300px] rounded-[2rem] border-4 border-foreground/10 bg-background p-3 shadow-xl"
            >
              <div className="flex items-center gap-2 border-b pb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  TP
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">TradePulse assistant</p>
                  <p className="text-[10px] text-muted-foreground">online</p>
                </div>
              </div>
              <div className="chat-bg -mx-3 mt-2 space-y-2 px-3 py-4">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                    Sold 4 kotas at R35 each
                  </p>
                </div>
                <div className="flex justify-start">
                  <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-background px-3 py-1.5 text-xs shadow-sm">
                    {"Sold 4 × Kota at R35,00 = R140,00 ✅\nStock on hand: 16."}
                  </p>
                </div>
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                    Bought 12 bread at R12 each
                  </p>
                </div>
                <div className="flex justify-start">
                  <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-background px-3 py-1.5 text-xs shadow-sm">
                    {"Bought 12 × Bread at R12,00 = R144,00 ✅\nStock on hand: 27."}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-2xl border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Readiness passport</p>
                <Badge variant="success">Bankable</Badge>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-primary/30 text-sm font-bold text-primary">
                  86
                </div>
                <div className="min-w-0 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Consistency: strong</p>
                  <p className="mt-0.5">6 months of records · R12 340 avg monthly revenue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 rounded-3xl border bg-card p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Your records, your rules.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              POPIA-style consent is built in. You choose whether your distributor, a bank, or an
              enterprise development partner can see your data — and you can switch it off at any
              time. Every record change is written to an audit trail.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "Simulated OTP + PIN keeps your account secure",
                "Consent toggles per partner type, revocable anytime",
                "Full audit log of every transaction change",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-6">
            <p className="text-sm font-semibold">Demo accounts</p>
            <p className="mb-4 text-xs text-muted-foreground">
              OTP is shown on screen (simulated). PINs below.
            </p>
            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((a) => (
                <div key={a.phone} className="rounded-xl border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{a.role}</span>
                    <Badge variant="secondary">PIN {a.pin}</Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">{a.name}</div>
                  <div className="font-mono text-xs">{a.phone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        TradePulse — hackathon MVP. Recorded data is used to demonstrate trader-readiness
        assessment and is not a formal credit report.{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy notice
        </Link>
      </footer>
    </div>
  );
}