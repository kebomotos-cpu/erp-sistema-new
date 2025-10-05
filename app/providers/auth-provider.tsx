"use client";

import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";

type Role = "dono" | "secretaria" | "vendedor";
type AppUser = (User & { appRole?: Role }) | null;

type Ctx = { user: AppUser; loading: boolean; logout: () => Promise<void> };
const AuthContext = createContext<Ctx>({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null); setLoading(false); return;
      }
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        const role = (snap.exists() ? (snap.data() as any).role : undefined) as Role | undefined;
        setUser(Object.assign(fbUser, { appRole: role }));
      } catch {
        setUser(Object.assign(fbUser, { appRole: undefined }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = async () => { await signOut(auth); };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
