"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, LayoutDashboard, Package, FileBadge, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/components/offline-provider";

const NAV = [
  { href: "/trader/chat", label: "Chat", icon: MessageCircle },
  { href: "/trader/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trader/inventory", label: "Stock", icon: Package },
  { href: "/trader/passport", label: "Passport", icon: FileBadge },
  { href: "/trader/settings", label: "Settings", icon: Settings },
];

export function TraderNav() {
  const pathname = usePathname();
  const { pending } = useOffline();

  return (
    <nav className="z-30 shrink-0 border-t bg-background/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "scale-110")} />
              {item.label}
              {item.href === "/trader/chat" && pending > 0 ? (
                <span className="absolute right-1/2 top-1 translate-x-3.5 rounded-full bg-destructive px-1.5 text-[9px] font-bold text-destructive-foreground">
                  {pending}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}