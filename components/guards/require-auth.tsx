"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";

type Role = "dono" | "secretaria" | "vendedor";
export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (roles && roles.length > 0 && !roles.includes(user.appRole as Role)) {
      router.replace("/sem-permissao");
    }
  }, [user, loading, roles, router]);

  if (loading) return null; // ou um skeleton
  return <>{children}</>;
}
