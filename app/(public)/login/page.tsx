"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  const doLogin = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      router.replace("/");
    } catch (e) {
      toast.error("Credenciais inválidas.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <Input placeholder="E-mail" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <Input placeholder="Senha" type="password" value={senha} onChange={(e)=>setSenha(e.target.value)} />
        <Button onClick={doLogin} disabled={loading} className="w-full">Entrar</Button>
      </div>
    </div>
  );
}
