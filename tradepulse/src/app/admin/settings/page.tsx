"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type MfaState = "unknown" | "off" | "pending" | "on";

interface MfaStatus {
  enabled: boolean;
  pendingEnroll: boolean;
}

export default function AdminSettingsPage() {
  const [state, setState] = useState<MfaState>("unknown");
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/mfa");
    if (!res.ok) return;
    const data: MfaStatus = await res.json();
    if (data.enabled) setState("on");
    else if (data.pendingEnroll) setState("pending");
    else setState("off");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return false;
      }
      if (data.secret) {
        setSecret(data.secret);
        setOtpauth(data.otpauthUri);
        setState("pending");
      } else if (data.enabled) {
        setSecret(null);
        setOtpauth(null);
        setCode("");
        setState("on");
      } else {
        setSecret(null);
        setOtpauth(null);
        setCode("");
        setState("off");
      }
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Account security and privacy for the TradePulse admin console.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="font-semibold">Two-factor authentication</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Protect the admin console with a time-based one-time passcode
                (TOTP) from an authenticator app such as Google Authenticator or
                Authy. Once enabled, logins require your PIN plus a 6-digit code.
              </p>
            </div>
          </div>
          <Badge state={state} pending={secret !== null} />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {state === "on" && (
          <div className="mt-4 space-y-3">
            <fieldset className="flex flex-wrap items-end gap-2">
              <label className="min-w-40 flex-1 text-sm font-medium">
                Enter a current code to disable
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="000000"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
              <button
                onClick={() => void run({ action: "disable", code })}
                disabled={busy || code.length !== 6}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Disable
              </button>
            </fieldset>
          </div>
        )}

        {(state === "off" || state === "pending") && (
          <div className="mt-4 space-y-4">
            {!secret && (
              <button
                onClick={() => void run({ action: "enroll" })}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Set up authenticator app
              </button>
            )}

            {secret && (
              <>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="mb-2 font-medium">1. Add the secret to your authenticator app</p>
                  <p className="mb-2 text-muted-foreground">
                    Scan the QR code (not available in demo) or enter this secret manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 font-mono text-sm">
                      {secret}
                    </code>
                    <button
                      onClick={() => void copySecret()}
                      className="inline-flex items-center gap-1 rounded-lg border bg-background px-3 py-2 text-xs"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      Copy
                    </button>
                  </div>
                  {otpauth && (
                    <p className="mt-2 break-all text-xs text-muted-foreground">
                      <span className="font-medium">Manual entry (advanced):</span> {otpauth}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Open your authenticator app, choose &quot;add account / manual
                    entry&quot;, and paste in the secret above.
                  </p>
                </div>

                <fieldset className="flex flex-wrap items-end gap-2">
                  <label className="min-w-40 flex-1 text-sm font-medium">
                    2. Confirm with a 6-digit code
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      placeholder="000000"
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    onClick={() => void run({ action: "confirm", code })}
                    disabled={busy || code.length !== 6}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Confirm & enable
                  </button>
                </fieldset>
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Privacy</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          TradePulse collects consent for sharing trading data with your
          distributor, bank and community partners. Review the full notice.
        </p>
        <Link
          href="/privacy"
          className="mt-2 inline-flex text-sm font-medium text-indigo-600 hover:underline"
        >
          Read the privacy notice →
        </Link>
      </div>
    </div>
  );
}

function Badge({ state, pending }: { state: MfaState; pending: boolean }) {
  const label =
    state === "on" ? "Enabled" : pending || state === "pending" ? "Pending setup" : "Not enabled";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
        state === "on"
          ? "bg-emerald-100 text-emerald-700"
          : state === "pending" || pending
            ? "bg-amber-100 text-amber-700"
            : "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}