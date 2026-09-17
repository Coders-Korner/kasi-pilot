"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { apiPost } from "@/lib/client-api";

const BUSINESS_TYPES = [
  "Spaza shop",
  "Cafe / Tuckshop",
  "General dealer",
  "Street vendor",
  "Salon / Barbershop",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    phone: "",
    ownerName: "",
    businessName: "",
    businessType: BUSINESS_TYPES[0],
    location: "",
    yearsInBusiness: "1",
    pin: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ devOtp: string | null }>("/api/auth/register", {
        ...form,
        yearsInBusiness: Number(form.yearsInBusiness) || 0,
      });
      setDevOtp(res.devOtp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ redirect?: string }>("/api/auth/verify", {
        phone: form.phone,
        otp,
      });
      router.push(res.redirect || "/trader/chat");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">
            {step === "form" ? "Create your TradePulse account" : "Verify your number"}
          </CardTitle>
          <CardDescription>
            {step === "form"
              ? "Takes under a minute. No bank details needed."
              : `We sent a 6-digit code to ${form.phone} (simulated).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {step === "form" ? (
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone">Phone number (WhatsApp)</Label>
                  <Input
                    id="phone"
                    placeholder="+27821234567"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName">Your name</Label>
                  <Input
                    id="ownerName"
                    placeholder="Thandi Nkosi"
                    value={form.ownerName}
                    onChange={(e) => update("ownerName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    placeholder="Thandi's Spaza Shop"
                    value={form.businessName}
                    onChange={(e) => update("businessName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessType">Business type</Label>
                  <Select
                    id="businessType"
                    value={form.businessType}
                    onChange={(e) => update("businessType", e.target.value)}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="years">Years trading</Label>
                  <Input
                    id="years"
                    type="number"
                    min="0"
                    value={form.yearsInBusiness}
                    onChange={(e) => update("yearsInBusiness", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="location">Town / area</Label>
                  <Input
                    id="location"
                    placeholder="Soweto, Johannesburg"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pin">Set a 4-digit PIN</Label>
                  <Input
                    id="pin"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={form.pin}
                    onChange={(e) => update("pin", e.target.value.replace(/\D/g, ""))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    You will use this PIN (plus an OTP) to log in later.
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={submitOtp} className="space-y-4">
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
                Verify & enter
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("form");
                  setOtp("");
                  setError("");
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            By registering you agree to our{" "}
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