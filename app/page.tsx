"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { db } from "@/firebase/config";
import {
  collection, onSnapshot, orderBy, query,
  type Timestamp, type CollectionReference
} from "firebase/firestore";

type Sale = {
  id: string;
  date: string;         // YYYY-MM-DD
  model: string;
  clientName: string;
  value: number;        // valorVenda
  downPayment?: number; // entrada
};

// Tipagem do documento bruto no Firestore
type FirestoreSaleDoc = {
  dataVenda?: Timestamp | string | null;
  modelo?: string | null;
  clienteNome?: string | null;
  valorVenda?: number | string | null;
  entrada?: number | string | null;
};

type SalesPoint = { label: string; revenue: number };

const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v.replace(/\./g, "").replace(",", "."));
  return 0;
};

const toIsoDate = (v: FirestoreSaleDoc["dataVenda"]): string => {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  const d: Date | undefined = typeof v.toDate === "function" ? v.toDate() : undefined;
  return d ? d.toISOString().slice(0, 10) : "";
};

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("month");

  useEffect(() => {
    // Coleção tipada elimina o any no d.data()
    const col = collection(db, "storehistoryc") as CollectionReference<FirestoreSaleDoc>;
    const q = query(col, orderBy("dataVenda", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Sale[] = snap.docs
          .map((d) => {
            const s = d.data(); // já é FirestoreSaleDoc
            const rawDate = toIsoDate(s.dataVenda);
            return {
              id: d.id,
              date: rawDate,                               // "2025-10-04"
              model: String(s.modelo ?? ""),
              clientName: String(s.clienteNome ?? ""),
              value: toNumber(s.valorVenda),               // 27340
              downPayment: toNumber(s.entrada),            // vazio -> 0
            };
          })
          .filter((r) => r.date && r.model && r.clientName);

        setSales(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore storehistoryc error:", err);
        setSales([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const series: SalesPoint[] = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const s of sales) {
      const d = new Date(s.date);
      let label = "";
      if (period === "month") {
        label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay()); // domingo
        label = weekStart.toISOString().slice(0, 10);
      }
      agg[label] = (agg[label] ?? 0) + s.value;
    }
    return Object.entries(agg)
      .map(([label, revenue]) => ({ label, revenue }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));
  }, [sales, period]);

  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.value, 0), [sales]);
  const totalSales = sales.length;

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Faturamento Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{money(totalRevenue)}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Total de Vendas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalSales}</p></CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${period === "week" ? "bg-orange-600 text-white" : "bg-muted"}`}
          onClick={() => setPeriod("week")}
        >
          Semana
        </button>
        <button
          className={`px-3 py-1 rounded ${period === "month" ? "bg-orange-600 text-white" : "bg-muted"}`}
          onClick={() => setPeriod("month")}
        >
          Mês
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução {period === "month" ? "Mensal" : "Semanal"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#ea580c" name="Faturamento" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Últimas Vendas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Data</th>
                  <th className="p-2">Modelo</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Entrada</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(-10).reverse().map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2">{new Date(s.date).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2">{s.model}</td>
                    <td className="p-2">{s.clientName}</td>
                    <td className="p-2">{money(s.value)}</td>
                    <td className="p-2 text-green-600">{money(s.downPayment ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
