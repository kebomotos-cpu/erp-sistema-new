"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider"; // seu provider
import { Sidebar } from "@/components/sidebar";          // opcional
import { cn } from "@/lib/utils";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=" + encodeURIComponent(pathname));
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    // tela de carregamento enquanto checa sessão
    return (
      <div className="grid h-svh place-items-center">
        <div className="animate-pulse text-sm text-muted-foreground">carregando…</div>
      </div>
    );
  }

  if (!user) return null; // evita flicker

  return (
    <div className={cn("min-h-svh flex")}>
      {/* Sidebar só para áreas protegidas */}
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
