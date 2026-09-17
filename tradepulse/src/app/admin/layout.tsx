import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });

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
      ]}
    >
      {children}
    </PortalShell>
  );
}