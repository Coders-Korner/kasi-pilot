import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice — TradePulse",
};

const sections = [
  {
    title: "Who we are",
    body: (
      <p>
        TradePulse is a financial-literacy MVP built to help South African spaza
        shops and township traders record sales, track stock and build a bankable
        trading history — often for the first time. TradePulse is a data controller
        under the Protection of Personal Information Act (POPIA).
      </p>
    ),
  },
  {
    title: "What we collect",
    body: (
      <p>
        We collect only what is needed to run the service: your phone number, name,
        business name, business type and location, your 4-digit PIN (stored as a
        scrambled hash, never in plain text), and the sales/purchase records you
        record with us. When you are offline, new records are temporarily stored
        on your device and synchronized when connectivity returns. When you are
        online, records and chat messages are sent to and stored on our servers
        so the dashboard, stock tracking and passport can work across sessions.
      </p>
    ),
  },
  {
    title: "Why we use it",
    body: (
      <p>
        Your records are used to (1) run the product you asked for — recording
        transactions, tracking stock, and generating your TradePulse passport; (2)
        measure and improve extraction accuracy; and (3) when you consent, share a
        verified summary with a bank, distributor or merchant-support programme so
        your trading record can work for you.
      </p>
    ),
  },
  {
    title: "Consent and sharing",
    body: (
      <p>
        Nothing is shared with a bank, distributor or community partner without your
        explicit consent, which you can control at any time in your settings. Each
        sharing arrangement shows exactly which summary data would be visible, and
        your personal records are never sold.
      </p>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <p>
        Records are kept while your account is active so your trading history and
        passport stay intact. If you close your account, we delete or de-identify
        your personal data in line with POPIA, except where we are required by law
        to retain records.
      </p>
    ),
  },
  {
    title: "Your rights",
    body: (
      <p>
        You have the right to access the personal data we hold about you, to correct
        inaccuracies, to object to or withdraw consent for processing, and (in some
        cases) to request deletion. To exercise any of these rights, contact us using
        the details below.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        We protect your data with Transport Layer Security in transit, hashed PINs,
        signed sessions, role-based access controls and continuous audit logging.
        You can also turn on two-factor authentication for sensitive admin access.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        This is a hackathon MVP, so contact details are simulated: reach the
        TradePulse team via the in-app Support ticket in the admin console, or email
        privacy@tradepulse.example. We aim to respond within 5 working days.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Back to TradePulse
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Privacy notice</h1>
      <p className="mt-2 text-muted-foreground">
        Effective date: September 2026 · Version 1.0 · South Africa (POPIA)
      </p>

      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">
        Privacy Notice V1.0 — published September 2026. This notice applies to the
        TradePulse hackathon MVP and will evolve with the product and applicable law.
      </div>
    </div>
  );
}