// app/(protected)/layout.tsx
"use client";

import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";
import { AuthProvider } from "@/app/providers/auth-provider";
import { RequireAuth } from "@/components/guards/require-auth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
            <main className="p-6">{children}</main>
      </RequireAuth>
    </AuthProvider>
  );
}
