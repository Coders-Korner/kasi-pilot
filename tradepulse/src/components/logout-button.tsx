"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/client-api";
import { useState } from "react";

export function LogoutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await apiPost("/api/auth/logout", {});
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="ghost" size={full ? "default" : "icon"} onClick={logout} disabled={loading}>
      <LogOut className="h-4 w-4" />
      {full ? "Log out" : null}
    </Button>
  );
}