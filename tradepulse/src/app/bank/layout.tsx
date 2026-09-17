import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal-shell";

export default async function BankLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "bank") redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });

  return (
    <PortalShell
      roleLabel="Bank / Funder portal"
      businessName={user?.businessName || "Bank"}
      userName={user?.ownerName || ""}
      accent="emerald"
      nav={[
        { href: "/bank", label: "Pipeline" },
        { href: "/bank/assessments", label: "Assessments" },
        { href: "/bank/portfolio", label: "Portfolio" },
      ]}
    >
      {children}
    </PortalShell>
  );
}