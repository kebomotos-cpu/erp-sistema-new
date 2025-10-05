// app/providers/auth-provider.tsx
"use client";
import { onAuthStateChanged, type User, signOut } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";

export type Role = "dono" | "secretaria" | "vendedor";
export type AppUser = (User & { appRole?: Role }) | null;

type Ctx = { user: AppUser; loading: boolean; logout: () => Promise<void> };

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  logout: async () => {},
});

type UserDoc = { role?: Role };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { setUser(null); setLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        const data = snap.exists() ? (snap.data() as UserDoc) : {};
        const appRole: Role | undefined = data.role;
        setUser({ ...fbUser, appRole });
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const logout = async () => { await signOut(auth); };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
