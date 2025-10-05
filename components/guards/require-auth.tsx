// components/guards/require-auth.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";

type Role = "dono" | "secretaria" | "vendedor";

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
      return;
    }
    if (roles && !roles.includes((user as any).appRole as Role)) {
      router.replace("/"); // ou página de acesso negado
    }
  }, [user, loading, roles, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}
