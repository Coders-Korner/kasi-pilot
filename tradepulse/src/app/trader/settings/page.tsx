"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, LifeBuoy, Loader2, Send, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { apiGet, apiPatch, apiPost } from "@/lib/client-api";
import { LogoutButton } from "@/components/logout-button";
import { formatDate, timeAgo } from "@/lib/utils";

interface Me {
  id: string;
  phone: string;
  ownerName: string;
  businessName: string;
  businessType: string;
  location: string;
  createdAt: string;
  consentDistributor: boolean;
  consentBank: boolean;
  consentEsd: boolean;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("low");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => apiGet<{ user: Me }>("/api/auth/me") });
  const { data: tickets } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => apiGet<{ tickets: Ticket[] }>("/api/tickets"),
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const consentMutation = useMutation({
    mutationFn: (payload: Record<string, boolean>) => apiPatch("/api/trader/consent", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const ticketMutation = useMutation({
    mutationFn: () => apiPost("/api/tickets", { subject, message, priority }),
    onSuccess: () => {
      setSubject("");
      setMessage("");
      setPriority("low");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const user = me?.user;

  return (
    <div className="h-full overflow-y-auto p-4 pb-6">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-bold">Settings</h1>

        {user ? (
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Your profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Owner" value={user.ownerName} />
              <Row label="Business" value={user.businessName} />
              <Row label="Type" value={user.businessType} />
              <Row label="Location" value={user.location} />
              <Row label="Phone" value={user.phone} />
              <Row label="Member since" value={formatDate(user.createdAt)} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Data sharing (POPIA consent)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConsentRow
              title="Distributor"
              desc="Let your supplier see stock levels and reorder alerts to send you promotions."
              checked={user?.consentDistributor ?? false}
              onChange={(v) => consentMutation.mutate({ consentDistributor: v })}
            />
            <ConsentRow
              title="Bank / Funder"
              desc="Share your readiness passport with lenders assessing you for finance."
              checked={user?.consentBank ?? false}
              onChange={(v) => consentMutation.mutate({ consentBank: v })}
            />
            <ConsentRow
              title="Enterprise development partner"
              desc="Allow programmes to see your trading activity for support and grants."
              checked={user?.consentEsd ?? false}
              onChange={(v) => consentMutation.mutate({ consentEsd: v })}
            />
            <p className="text-[11px] text-muted-foreground">
              You can withdraw consent at any time. Changes are recorded in your audit trail.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Download className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Install as an app</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Add TradePulse to your home screen so it opens like a normal app — even without data.
            </p>
            {installEvent ? (
              <Button
                onClick={async () => {
                  const evt = installEvent as unknown as { prompt: () => Promise<void> };
                  await evt.prompt();
                  setInstallEvent(null);
                }}
              >
                <Download className="h-4 w-4" /> Install TradePulse
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                On Android Chrome: tap the menu → “Add to Home screen”. On iPhone Safari: Share →
                “Add to Home Screen”.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Help & support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tickets?.tickets.length ? (
              <div className="space-y-2">
                {tickets.tickets.map((t) => (
                  <div key={t.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.subject}</span>
                      <Badge
                        variant={t.status === "resolved" ? "success" : t.status === "in_progress" ? "warning" : "secondary"}
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.message} · {timeAgo(t.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No support tickets yet.</p>
            )}
            <div className="space-y-2 border-t pt-3">
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Textarea
                placeholder="Describe the problem…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-32">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
                <Button
                  onClick={() => ticketMutation.mutate()}
                  disabled={ticketMutation.isPending || !subject.trim() || !message.trim()}
                >
                  {ticketMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pb-2">
          <LogoutButton full />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ConsentRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}