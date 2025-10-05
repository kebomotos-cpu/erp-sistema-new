// components/guards/require-auth.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import type { Role } from "@/app/providers/auth-provider";

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: ReadonlyArray<Role>;
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

    if (roles?.length) {
      const userRole: Role | undefined = user.appRole;
      if (!userRole || !roles.includes(userRole)) router.replace("/");
    }
  }, [loading, user, roles, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}
