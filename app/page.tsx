"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { db } from "@/firebase/config";
import {
  collection, onSnapshot, orderBy, query,
  type Timestamp, type CollectionReference, type QueryDocumentSnapshot
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

/* ------------------ Tipos ------------------ */
type Sale = {
  id: string;
  date: string;         // YYYY-MM-DD (local, sem UTC)
  model: string;
  clientName: string;
  value: number;        // valorVenda
  downPayment?: number; // entrada
};

type FirestoreSaleDoc = {
  dataVenda?: Timestamp | string | null;
  modelo?: string | null;
  clienteNome?: string | null;
  valorVenda?: number | string | null;
  entrada?: number | string | null;
};

type SalesPoint = { label: string; revenue: number };

/* ------------------ Helpers ------------------ */
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    return Number(v.replace(/\./g, "").replace(",", "."));
  }
  return 0;
};

// type guard para objetos com toDate()
function hasToDate(x: unknown): x is { toDate: () => Date } {
  return typeof x === "object" && x !== null && "toDate" in x && typeof (x as { toDate: unknown }).toDate === "function";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const toLocalYMDFromDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Converte dataVenda (Timestamp|string) para "YYYY-MM-DD" **local**
const toYmd = (v: FirestoreSaleDoc["dataVenda"]): string => {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10); // já está como YMD no seu backend
  if (hasToDate(v)) {
    const d = v.toDate();              // Date em horário local do ambiente
    return toLocalYMDFromDate(d);      // ✅ YMD local (sem toISOString)
  }
  return "";
};

// "YYYY-MM-DD" -> Date local (NUNCA new Date(ymd) direto, que é UTC)
const parseYMDLocal = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Exibição BR
const ymdToBR = (ymd: string) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${pad2(d)}.${pad2(m)}.${y}`;
};

// helpers de data
const isValidDate = (d: Date) => !Number.isNaN(d.getTime());
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/* ------------------ Componente ------------------ */
export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const col = collection(db, "storehistoryc") as CollectionReference<FirestoreSaleDoc>;
    const q = query(col, orderBy("dataVenda", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const seen = new Set<string>();

        const rows = snap.docs
          .map((d: QueryDocumentSnapshot<FirestoreSaleDoc>) => {
            const s = d.data();
            const rawDate = toYmd(s.dataVenda); // ✅ local YMD, sem UTC
            const key = `${s.modelo ?? ""}-${s.clienteNome ?? ""}-${rawDate}`;

            if (seen.has(key)) return null;
            seen.add(key);

            const row: Sale = {
              id: d.id,
              date: rawDate,
              model: String(s.modelo ?? ""),
              clientName: String(s.clienteNome ?? ""),
              value: toNumber(s.valorVenda),
              downPayment: toNumber(s.entrada),
            };
            return row;
          })
          .filter((r): r is Sale => r !== null);

        setSales(rows);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("Firestore storehistoryc error:", err);
        setSales([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filtro por intervalo de datas (usa parseYMDLocal)
  const filteredSales = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return sales;
    const minDate = dateRange?.from ? startOfDay(dateRange.from) : new Date(-8640000000000000);
    const maxDate = dateRange?.to ? endOfDay(dateRange.to) : new Date(8640000000000000);

    return sales.filter((s) => {
      if (!s.date) return false;
      const d = parseYMDLocal(s.date);       // ✅ local
      if (!isValidDate(d)) return false;
      return d >= minDate && d <= maxDate;
    });
  }, [sales, dateRange]);

  // Agregação semanal/mensal sem UTC
  const series: SalesPoint[] = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const s of filteredSales) {
      if (!s.date) continue;
      const d = parseYMDLocal(s.date);       // ✅ local
      if (!isValidDate(d)) continue;

      let label = "";
      if (period === "month") {
        label = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // ex.: 2025-10
      } else {
        const weekStart = new Date(d);
        // Domingo como início da semana (padrão JS)
        weekStart.setDate(d.getDate() - d.getDay());
        label = toLocalYMDFromDate(weekStart); // ✅ YMD local
      }
      agg[label] = (agg[label] ?? 0) + s.value;
    }
    return Object.entries(agg)
      .map(([label, revenue]) => ({ label, revenue }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));
  }, [filteredSales, period]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.value, 0), [filteredSales]);
  const totalSales = filteredSales.length;

  const formatRangeLabel = (r?: DateRange) => {
    if (!r?.from && !r?.to) return "Filtrar por período";
    const fmt = (d?: Date) => (d ? d.toLocaleDateString("pt-BR") : "—");
    return `${fmt(r?.from)} — ${fmt(r?.to)}`;
  };

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

      <div className="flex flex-wrap gap-2 items-center">
        {/* Toggle Semana/Mês */}
        <div className="flex gap-2">
          <Button
            variant={period === "week" ? "default" : "secondary"}
            onClick={() => setPeriod("week")}
          >
            Semana
          </Button>
          <Button
            variant={period === "month" ? "default" : "secondary"}
            onClick={() => setPeriod("month")}
          >
            Mês
          </Button>
        </div>

        {/* Filtro por intervalo (Calendar) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[240px] justify-start">
              {formatRangeLabel(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={dateRange}
              onSelect={(r) => setDateRange(r)}
              initialFocus
            />
            <div className="flex justify-between p-2 border-t">
              <Button variant="ghost" onClick={() => setDateRange(undefined)}>
                Limpar
              </Button>
              <Button onClick={() => { /* fecha ao clicar fora */ }}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {dateRange && (
          <Button variant="secondary" onClick={() => setDateRange(undefined)}>
            Remover filtro de data
          </Button>
        )}
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
                {filteredSales.slice(-10).reverse().map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2">{s.date ? ymdToBR(s.date) : "—"}</td>
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
