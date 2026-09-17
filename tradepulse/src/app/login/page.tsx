"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiPost } from "@/lib/client-api";

type Step = "phone" | "otp" | "pin" | "mfa";

const QUICK = [
  { label: "Trader (Thandi)", phone: "+27821234567", pin: "1234" },
  { label: "Distributor", phone: "+27821110000", pin: "0000" },
  { label: "Bank", phone: "+27832220000", pin: "0000" },
  { label: "Admin", phone: "+27840000000", pin: "0000" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(params.get("phone") || "");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [pinTicket, setPinTicket] = useState<string | null>(null);
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);
  const [mfa, setMfa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp(e?: React.FormEvent, overridePhone?: string) {
    e?.preventDefault();
    const target = overridePhone || phone;
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ devOtp: string | null }>("/api/auth/login", { phone: target });
      setPhone(target);
      setDevOtp(res.devOtp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ requiresPin?: boolean; pinTicket?: string; redirect?: string }>(
        "/api/auth/verify",
        { phone, otp }
      );
      if (res.requiresPin) {
        setPinTicket(res.pinTicket ?? null);
        setStep("pin");
      } else {
        router.push(res.redirect || "/trader/chat");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!pinTicket) throw new Error("Your OTP session expired. Please request a new code.");
      const res = await apiPost<{ mfaRequired?: boolean; mfaTicket?: string; redirect?: string }>("/api/auth/pin", {
        phone,
        pin,
        pinTicket,
      });
      if (res.mfaRequired) {
        setMfaTicket(res.mfaTicket ?? null);
        setMfa("");
        setStep("mfa");
      } else {
        router.push(res.redirect || "/trader/chat");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect PIN");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!mfaTicket) throw new Error("Your MFA session expired. Please log in again.");
      const res = await apiPost<{ redirect: string }>("/api/auth/mfa", {
        phone,
        code: mfa,
        mfaTicket,
      });
      router.push(res.redirect || "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
      setMfa("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">
            {step === "phone"
              ? "Welcome back"
              : step === "otp"
                ? "Enter your code"
                : step === "pin"
                  ? "Enter your PIN"
                  : "Two-factor verification"}
          </CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Log in with your phone number"
              : step === "otp"
                ? `Code sent to ${phone} (simulated)`
                : step === "pin"
                  ? "Two-factor keeps your business records safe"
                  : `Enter the 6-digit code from your authenticator app for ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : null}

          {step === "phone" ? (
            <>
              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    placeholder="+27821234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send OTP
                </Button>
              </form>
              <div className="mt-5">
                <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick demo login
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK.map((q) => (
                    <Button
                      key={q.phone}
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => void sendOtp(undefined, q.phone)}
                    >
                      {q.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : step === "otp" ? (
            <form onSubmit={verifyOtp} className="space-y-4">
              {devOtp ? (
                <div className="rounded-lg border border-primary/30 bg-accent p-3 text-sm">
                  <span className="font-medium">Demo mode:</span> your code is{" "}
                  <span className="font-mono text-base font-bold tracking-widest">{devOtp}</span>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Change number
              </Button>
            </form>
          ) : step === "pin" ? (
            <form onSubmit={verifyPin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pin">4-digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[0.5em]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading || pin.length !== 4}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Log in
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyMfa} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mfa">6-digit authenticator code</Label>
                <Input
                  id="mfa"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em]"
                  value={mfa}
                  onChange={(e) => setMfa(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading || mfa.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("phone");
                  setMfa("");
                  setPin("");
                  setError("");
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Start over
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New to TradePulse?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            By using TradePulse you agree to our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              privacy notice
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}