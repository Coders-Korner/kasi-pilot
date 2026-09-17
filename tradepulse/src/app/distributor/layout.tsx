import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal-shell";

export default async function DistributorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "distributor") redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });

  return (
    <PortalShell
      roleLabel="Distributor portal"
      businessName={user?.businessName || "Distributor"}
      userName={user?.ownerName || ""}
      nav={[
        { href: "/distributor", label: "Overview" },
        { href: "/distributor/retailers", label: "Retailers" },
        { href: "/distributor/promotions", label: "Promotions" },
      ]}
    >
      {children}
    </PortalShell>
  );
}