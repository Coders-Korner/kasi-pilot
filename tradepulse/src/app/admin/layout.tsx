import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ADMIN_INACTIVITY_MS } from "@/lib/api-helpers";
import { PortalShell } from "@/components/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.status !== "active") redirect("/login");

  // Admin session inactivity logout (mirrors the API-layer check in getActor).
  if (user.lastActiveAt && Date.now() - user.lastActiveAt.getTime() > ADMIN_INACTIVITY_MS) {
    redirect("/login");
  }

  return (
    <PortalShell
      roleLabel="Admin console"
      businessName={user?.businessName || "TradePulse"}
      userName={user?.ownerName || "Admin"}
      accent="indigo"
      nav={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/tickets", label: "Support" },
        { href: "/admin/settings", label: "Settings" },
      ]}
    >
      {children}
    </PortalShell>
  );
}