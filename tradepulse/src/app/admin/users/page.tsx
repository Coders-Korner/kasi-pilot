"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { apiGet, apiPatch } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  phone: string;
  ownerName: string;
  businessName: string;
  businessType: string;
  location: string;
  role: string;
  status: string;
  isVerified: boolean;
  consentDistributor: boolean;
  consentBank: boolean;
  createdAt: string;
  lastActiveAt: string | null;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, status, q],
    queryFn: () => {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      return apiGet<{ users: AdminUser[] }>(`/api/admin/users?${params.toString()}`);
    },
  });

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiPatch(`/api/admin/users/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">Manage traders, distributors and banks.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, business or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-40">
          <option value="">All roles</option>
          <option value="trader">Traders</option>
          <option value="distributor">Distributors</option>
          <option value="bank">Banks</option>
          <option value="admin">Admins</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : data?.users.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No users match.</p>
          ) : (
            <div className="divide-y">
              {data?.users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-[180px] flex-1">
                    <p className="font-medium">{u.businessName || u.ownerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.ownerName} · {u.phone}
                    </p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block">
                    {u.location || "—"}
                    <br />
                    joined {formatDate(u.createdAt)}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {u.role}
                  </Badge>
                  <Badge variant={u.consentBank ? "success" : "secondary"}>
                    {u.consentBank ? "bank-consented" : "no bank consent"}
                  </Badge>
                  <Badge variant={u.status === "active" ? "success" : "destructive"}>{u.status}</Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ id: u.id, payload: { isVerified: !u.isVerified } })
                      }
                    >
                      {u.isVerified ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified
                        </>
                      ) : (
                        <>
                          <ShieldOff className="h-3.5 w-3.5" /> Unverified
                        </>
                      )}
                    </Button>
                    <Button
                      variant={u.status === "active" ? "destructive" : "default"}
                      size="sm"
                      onClick={() =>
                        mutation.mutate({
                          id: u.id,
                          payload: { status: u.status === "active" ? "suspended" : "active" },
                        })
                      }
                    >
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}