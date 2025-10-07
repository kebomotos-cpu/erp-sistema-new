"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, type Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "sonner";

// UI
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Chart
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Line } from "recharts";

// Day picker
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------- Tipos ----------
type FirestorePrimitiveDate = string | Timestamp | Date | null | undefined;

type SaleFS = {
  dataVenda?: FirestorePrimitiveDate; // string "YYYY-MM-DD", Timestamp ou Date
  valorVenda?: number | string | null;
  vendedorResponsavel?: string | null;
  clienteNome?: string | null;
  modelo?: string | null;
};

type Sale = {
  id: string;
  date: string;  // YYYY-MM-DD normalizado
  value: number; // valorVenda
  seller: string;
  label: string; // exibição rápida
  client: string;
  model: string;
};

type VendedorAgg = { seller: string; total: number; count: number };
type SalesPoint = { label: string; revenue: number };

// ---------- Utils ----------
const money = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseNumberBR(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const norm = v.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number(norm);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toISODateFromFS(input: FirestorePrimitiveDate): string {
  if (!input) return "";
  // Firestore Timestamp
  if (typeof input === "object" && input !== null && "toDate" in input) {
    try {
      const d = (input as Timestamp).toDate();
      return d.toISOString().slice(0, 10);
    } catch {
      // prossegue para as demais tentativas
    }
  }
  // Date nativo
  if (input instanceof Date) {
    if (Number.isFinite(input.getTime())) return input.toISOString().slice(0, 10);
    return "";
  }
  // String ISO/aaaa-mm-dd
  if (typeof input === "string") {
    const s = input.slice(0, 10);
    // validação rápida yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(input);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

export default function DashVendasPage() {
  // filtros
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth,
    to: today,
  });
  const [sellerFilter, setSellerFilter] = useState<string>("__ALL__");

  // dados
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<string[]>([]);

  // carregar dados
  useEffect(() => {
    (async () => {
      try {
        const qSales = query(collection(db, "storehistoryc"), orderBy("dataVenda", "asc"));
        const snap = await getDocs(qSales);

        const list: Sale[] = snap.docs
          .map((doc) => {
            const raw = doc.data() as SaleFS;

            const dt = toISODateFromFS(raw.dataVenda);
            if (!dt) return null;

            const value = parseNumberBR(raw.valorVenda);
            const seller = (raw.vendedorResponsavel ?? "—").toString();
            const client = raw.clienteNome ?? "";
            const model = raw.modelo ?? "";

            const item: Sale = {
              id: doc.id,
              date: dt,
              value,
              seller,
              label: `${client} • ${model}`,
              client,
              model,
            };
            return item;
          })
          .filter((x): x is Sale => Boolean(x));

        setSales(list);

        const uniqSellers = Array.from(
          new Set(list.map((s) => s.seller).filter((v) => v && v !== "—"))
        ).sort((a, b) => a.localeCompare(b, "pt-BR"));
        setSellers(uniqSellers);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar dados.");
      }
    })();
  }, []);

  // aplica filtros
  const filteredSales = useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;

    const fromFloor = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
    const toCeil = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate()) : null;

    return sales.filter((s) => {
      const d = new Date(`${s.date}T00:00:00`);
      const inDate =
        (!fromFloor || d >= fromFloor) &&
        (!toCeil || d <= toCeil);
      const inSeller = sellerFilter === "__ALL__" || s.seller === sellerFilter;
      return inDate && inSeller;
    });
  }, [sales, dateRange, sellerFilter]);

  // Série por dia
  const chartData: SalesPoint[] = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of filteredSales) {
      byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.value);
    }
    return Array.from(byDay.entries())
      .map(([label, revenue]) => ({ label, revenue }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));
  }, [filteredSales]);

  // Por vendedor (respeitando filtros de data)
  const porVendedor: VendedorAgg[] = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const s of filteredSales) {
      const cur = map.get(s.seller) ?? { total: 0, count: 0 };
      cur.total += s.value;
      cur.count += 1;
      map.set(s.seller, cur);
    }
    return Array.from(map.entries())
      .map(([seller, v]) => ({ seller, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Detalhamento por vendedor
  const vendasPorVendedor = useMemo(() => {
    const map = new Map<string, Sale[]>();
    for (const s of filteredSales) {
      const arr = map.get(s.seller) ?? [];
      arr.push(s);
      map.set(s.seller, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.date < b.date ? 1 : -1));
      map.set(k, arr);
    }
    return map;
  }, [filteredSales]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard de Vendas</h1>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Date range */}
          <div className="flex flex-col gap-2">
            <Label>Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecione uma data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Seller */}
          <div className="flex flex-col gap-2">
            <Label>Vendedor</Label>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ações */}
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSellerFilter("__ALL__");
                setDateRange({ from: startOfMonth, to: today });
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Gráfico */}
      <Card className="p-5">
        <div className="text-sm text-muted-foreground mb-2">Faturamento por dia</div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(v: number) => money(v)} />
              <Line type="monotone" dataKey="revenue" dot strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Por vendedor */}
      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-3">Faturamento por vendedor</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">Vendedor</th>
                <th className="p-2">Faturamento</th>
                <th className="p-2">Vendas</th>
              </tr>
            </thead>
            <tbody>
              {porVendedor.map((row) => (
                <tr key={row.seller} className="border-b">
                  <td className="p-2">{row.seller}</td>
                  <td className="p-2">{money(row.total)}</td>
                  <td className="p-2">{row.count}</td>
                </tr>
              ))}
              {porVendedor.length === 0 && (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground" colSpan={3}>
                    Sem vendas no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detalhamento por vendedor */}
      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-3">Detalhamento das vendas (filtradas) por vendedor</div>
        {porVendedor.map(({ seller }) => {
          const vendas = vendasPorVendedor.get(seller) ?? [];
          return (
            <div key={seller} className="mb-6">
              <div className="font-semibold mb-2">{seller}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2">Data</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2">Modelo</th>
                      <th className="p-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.map((v) => (
                      <tr key={v.id} className="border-b">
                        <td className="p-2 whitespace-nowrap">{v.date}</td>
                        <td className="p-2">{v.client || "—"}</td>
                        <td className="p-2">{v.model || "—"}</td>
                        <td className="p-2">{money(v.value)}</td>
                      </tr>
                    ))}
                    {vendas.length === 0 && (
                      <tr>
                        <td className="p-3 text-muted-foreground" colSpan={4}>
                          Sem vendas deste vendedor no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {porVendedor.length === 0 && (
          <div className="p-3 text-sm text-muted-foreground">Sem vendas no período.</div>
        )}
      </Card>
    </div>
  );
}
