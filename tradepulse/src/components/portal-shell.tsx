"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Megaphone,
  Users,
  LifeBuoy,
  ClipboardCheck,
  Landmark,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { ConnectionStatus } from "@/components/connection-status";

export interface PortalNavItem {
  href: string;
  label: string;
}

// Icons are resolved inside this client component so server layouts only need
// to pass serialisable { href, label } data across the RSC boundary.
const NAV_ICONS: Record<string, LucideIcon> = {
  "/distributor": LayoutDashboard,
  "/distributor/retailers": Store,
  "/distributor/promotions": Megaphone,
  "/admin": LayoutDashboard,
  "/admin/users": Users,
  "/admin/tickets": LifeBuoy,
  "/bank": LayoutDashboard,
  "/bank/assessments": ClipboardCheck,
  "/bank/portfolio": Landmark,
  "/admin/settings": Settings,
};

export function PortalShell({
  roleLabel,
  businessName,
  userName,
  nav,
  accent = "primary",
  children,
}: {
  roleLabel: string;
  businessName: string;
  userName: string;
  nav: PortalNavItem[];
  accent?: "primary" | "indigo" | "emerald";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const accentClass = {
    primary: "bg-primary",
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
  }[accent];
  const activeItem = nav.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white", accentClass)}>
            <span className="text-sm font-bold">TP</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">TradePulse</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <p className="truncate text-sm font-semibold">{businessName}</p>
          <p className="truncate text-xs text-muted-foreground">{userName}</p>
          <div className="mt-2 flex items-center justify-between">
            <ConnectionStatus compact />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", accentClass)}>
              <span className="text-xs font-bold">TP</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{businessName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {activeItem?.label ?? roleLabel}
              </p>
            </div>
          </div>
          <LogoutButton />
        </header>
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b bg-background px-2 py-1.5 lg:hidden">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}