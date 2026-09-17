import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TraderNav } from "@/components/trader-nav";
import { ConnectionStatus } from "@/components/connection-status";
import { LogoutButton } from "@/components/logout-button";

export default async function TraderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "trader") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { businessName: true, ownerName: true, isVerified: true },
  });
  if (!user) redirect("/login");

  const initials = (user.businessName || user.ownerName)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-[100dvh] flex-col bg-muted/30">
      <header className="z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{user.businessName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.ownerName}</p>
          </div>
          <ConnectionStatus />
          <LogoutButton />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      <TraderNav />
    </div>
  );
}