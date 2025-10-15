"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  type Timestamp,
  doc as fsDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "sonner";

// UI
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Chart
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from "recharts";

// Day picker
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------- Tipos ----------
type FirestorePrimitiveDate = string | Timestamp | Date | null | undefined;

type SaleFS = {
  dataVenda?: FirestorePrimitiveDate;
  valorVenda?: number | string | null;
  vendedorResponsavel?: string | null;
  clienteNome?: string | null;
  modelo?: string | null;

  // extras opcionais se existirem
  clienteCPF?: string | null;
  clienteTelefone?: string | null;
  clienteEndereco?: string | null;
  clienteCidade?: string | null;
  clienteEstado?: string | null;

  motoMarca?: string | null;
  motoAno?: string | number | null;
  motoChassi?: string | null;
  motoPlaca?: string | null;
  motoCor?: string | null;
};

type Sale = {
  id: string;
  date: string;  // YYYY-MM-DD
  value: number;
  seller: string;
  label: string;
  client: string;
  model: string;

  clientCPF?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;

  motoBrand?: string;
  motoYear?: string | number;
  motoChassis?: string;
  motoPlate?: string;
  motoColor?: string;
};

type ExpenseFS = {
  // aceita "dataDespesa" OU "data"
  dataDespesa?: FirestorePrimitiveDate;
  data?: FirestorePrimitiveDate;

  valor?: number | string | null;
  categoria?: string | null; 
  tipo?: string | null;      // "loja" | "geral" (heurística se vier vazio)
  descricao?: string | null;

  // gerais com vínculo de moto:
  motoId?: string | null;
  moto?: {
    modelo?: string | null;
    placa?: string | null;
    chassi?: string | null;
  } | null;
};

type Expense = {
  id: string;
  date: string;     // YYYY-MM-DD
  value: number;
  category: string;
  kind: "loja" | "geral";
  description: string;

  // vínculo de moto resolvido
  motoId?: string;
  motoModel?: string;
  motoPlate?: string;
  motoChassis?: string;
};

type MotoDoc = {
  adicionais?: {
    ano?: string | number;
    chassi?: string;
    cor?: string;
    marca?: string;
    modelo?: string;
    placa?: string;
    valorVenda?: number;
    // ...outros
  };
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
  if (typeof input === "object" && input !== null && "toDate" in input) {
    try {
      const d = (input as Timestamp).toDate();
      return d.toISOString().slice(0, 10);
    } catch {}
  }
  if (input instanceof Date) {
    if (Number.isFinite(input.getTime())) return input.toISOString().slice(0, 10);
    return "";
  }
  if (typeof input === "string") {
    const s = input.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(input);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

function safe(v: unknown) {
  if (v === undefined || v === null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "—";
  return String(v);
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

type ClientInfo = {
  nome?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

type MotoInfo = {
  marca?: string | null;
  modelo?: string | null;
  ano?: string | number | null;
  chassi?: string | null;
  placa?: string | null;
  cor?: string | null;
};

function enrichSaleForReport(s: Sale): {
  date: string; value: number; seller: string; client: ClientInfo; moto: MotoInfo;
} {
  const client: ClientInfo = {
    nome: s.client || "—",
    cpf: s.clientCPF ?? undefined,
    telefone: s.clientPhone ?? undefined,
    endereco: s.clientAddress ?? undefined,
    cidade: s.clientCity ?? undefined,
    estado: s.clientState ?? undefined,
  };
  const moto: MotoInfo = {
    marca: s.motoBrand ?? undefined,
    modelo: s.model || "—",
    ano: s.motoYear ?? undefined,
    chassi: s.motoChassis ?? undefined,
    placa: s.motoPlate ?? undefined,
    cor: s.motoColor ?? undefined,
  };
  return { date: s.date, value: s.value, seller: s.seller, client, moto };
}

function classifyExpenseKind(categoria: string | null | undefined, tipo: string | null | undefined): "loja" | "geral" {
  const raw = (categoria ?? "").toLowerCase();
  const t = (tipo ?? "").toLowerCase();
  if (t === "loja") return "loja";
  if (t === "geral") return "geral";
  if (raw.startsWith("loja")) return "loja"; // ex: "Loja", "Loja: Luz"
  return "geral";
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [motosMap, setMotosMap] = useState<Record<string, { modelo?: string; placa?: string; chassi?: string }>>({});

  // carregar VENDAS
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

              clientCPF: raw.clienteCPF ?? undefined,
              clientPhone: raw.clienteTelefone ?? undefined,
              clientAddress: raw.clienteEndereco ?? undefined,
              clientCity: raw.clienteCidade ?? undefined,
              clientState: raw.clienteEstado ?? undefined,

              motoBrand: raw.motoMarca ?? undefined,
              motoYear: raw.motoAno ?? undefined,
              motoChassis: raw.motoChassi ?? undefined,
              motoPlate: raw.motoPlaca ?? undefined,
              motoColor: raw.motoCor ?? undefined,
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
        toast.error("Erro ao carregar vendas.");
      }
    })();
  }, []);

  // carregar DESPESAS + map de MOTO
  useEffect(() => {
    (async () => {
      try {
        // despesas
        const qExp = query(collection(db, "despesas"), orderBy("data", "asc")); // seus docs usam "data"
        const snap = await getDocs(qExp);

        // coletar ids de moto que precisamos resolver
        const motoIds = new Set<string>();

        const listPre: Expense[] = snap.docs
          .map((doc) => {
            const raw = doc.data() as ExpenseFS;
            const dt = toISODateFromFS(raw.dataDespesa ?? raw.data);
            if (!dt) return null;
            const value = parseNumberBR(raw.valor);
            const category = (raw.categoria ?? "Outros").toString();
            const kind = classifyExpenseKind(raw.categoria, raw.tipo);
            const description = (raw.descricao ?? "").toString();

            const exp: Expense = {
              id: doc.id,
              date: dt,
              value,
              category,
              kind,
              description,
            };

            // vinculo de moto
            const mid = raw.motoId ?? undefined;
            if (mid) {
              exp.motoId = mid;
              motoIds.add(mid);
            }
            if (raw.moto) {
              exp.motoModel = raw.moto.modelo ?? exp.motoModel;
              exp.motoPlate = raw.moto.placa ?? exp.motoPlate;
              exp.motoChassis = raw.moto.chassi ?? exp.motoChassis;
            }

            return exp;
          })
          .filter((x): x is Expense => Boolean(x));

        // resolver motos (apenas as necessárias)
        const motosResolved: Record<string, { modelo?: string; placa?: string; chassi?: string }> = {};
        if (motoIds.size > 0) {
          // fetch cada doc; se quiser otimizar, guarde cache global
          for (const id of motoIds) {
            try {
              const ref = fsDoc(db, "motos", id);
              const snapMoto = await getDoc(ref);
              if (snapMoto.exists()) {
                const data = snapMoto.data() as MotoDoc;
                motosResolved[id] = {
                  modelo: data?.adicionais?.modelo,
                  placa: data?.adicionais?.placa,
                  chassi: data?.adicionais?.chassi,
                };
              }
            } catch (e) {
              console.warn("Falha ao buscar moto", id, e);
            }
          }
        }
        setMotosMap(motosResolved);

        // injeta info de moto resolvida
        const list = listPre.map((e) => {
          if (e.motoId && motosResolved[e.motoId]) {
            const m = motosResolved[e.motoId]!;
            return { ...e,
              motoModel: e.motoModel ?? m.modelo,
              motoPlate: e.motoPlate ?? m.placa,
              motoChassis: e.motoChassis ?? m.chassi,
            };
          }
          return e;
        });

        setExpenses(list);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar despesas.");
      }
    })();
  }, []);

  // ----- filtros -----
  const filteredSales = useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;
    const fromFloor = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
    const toCeil = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate()) : null;

    return sales.filter((s) => {
      const d = new Date(`${s.date}T00:00:00`);
      const inDate = (!fromFloor || d >= fromFloor) && (!toCeil || d <= toCeil);
      const inSeller = sellerFilter === "__ALL__" || s.seller === sellerFilter;
      return inDate && inSeller;
    });
  }, [sales, dateRange, sellerFilter]);

  const filteredExpenses = useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;
    const fromFloor = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
    const toCeil = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate()) : null;

    return expenses.filter((e) => {
      const d = new Date(`${e.date}T00:00:00`);
      return (!fromFloor || d >= fromFloor) && (!toCeil || d <= toCeil);
    });
  }, [expenses, dateRange]);

  // ----- métricas / agrupamentos -----
  const chartData: SalesPoint[] = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of filteredSales) {
      byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.value);
    }
    return Array.from(byDay.entries())
      .map(([label, revenue]) => ({ label, revenue }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));
  }, [filteredSales]);

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

  const totalFaturamento = useMemo(() => sum(filteredSales.map(s => s.value)), [filteredSales]);

  const despesasLoja = useMemo(() => filteredExpenses.filter(e => e.kind === "loja"), [filteredExpenses]);
  const despesasGerais = useMemo(() => filteredExpenses.filter(e => e.kind === "geral"), [filteredExpenses]);

  const subtotalLoja = useMemo(() => sum(despesasLoja.map(d => d.value)), [despesasLoja]);
  const subtotalGerais = useMemo(() => sum(despesasGerais.map(d => d.value)), [despesasGerais]);
  const totalDespesas = subtotalLoja + subtotalGerais;
  const lucroLiquido = totalFaturamento - totalDespesas;

  function groupExpensesByCategory(rows: Expense[]) {
    const map = new Map<string, Expense[]>();
    for (const e of rows) {
      const key = e.category || "Outros";
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries())
      .map(([cat, list]) => ({ cat, list, total: sum(list.map(x => x.value)) }))
      .sort((a, b) => b.total - a.total);
  }

  const lojaPorCategoria = useMemo(() => groupExpensesByCategory(despesasLoja), [despesasLoja]);
  const geraisPorCategoria = useMemo(() => groupExpensesByCategory(despesasGerais), [despesasGerais]);

  // --------- Exportação .DOC sem libs (HTML -> .doc) ---------
  function exportDOCWordLike() {
    const period =
      `${dateRange?.from ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR }) : "—"} a ` +
      `${dateRange?.to ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR }) : "—"}`;
    const sellerInfo =
      sellerFilter === "__ALL__" ? "Todos os vendedores" : `Vendedor: ${sellerFilter}`;

    const renderExpensesTable = (title: string, groups: { cat: string; list: Expense[]; total: number }[], subtotal: number) => {
      const rows = groups.map(g => {
        const inner = g.list.map(e => {
          const motoStr = [e.motoModel, e.motoPlate, e.motoChassis]
            .filter(Boolean).join(" • ");
          return `
            <tr>
              <td>${e.date}</td>
              <td>${safe(e.description)}</td>
              <td>${safe(e.category)}</td>
              <td>${motoStr || "—"}</td>
              <td style="text-align:right">${money(e.value)}</td>
            </tr>
          `;
        }).join("");
        return `
          <div class="block">
            <div class="subsection-title">${safe(g.cat)} <span class="chip">Subtotal: ${money(g.total)}</span></div>
            <table class="table">
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Moto (se houver)</th><th class="num">Valor</th></tr></thead>
              <tbody>${inner || `<tr><td colspan="5" class="muted">Sem despesas</td></tr>`}</tbody>
            </table>
          </div>
        `;
      }).join("");

      return `
        <div class="section">
          <div class="section-title">${title} <span class="chip chip-strong">Subtotal ${title}: ${money(subtotal)}</span></div>
          ${rows || `<div class="muted">Sem despesas em ${title} no período.</div>`}
        </div>
      `;
    };

    const renderSalesDetail = () => {
      const blocks = porVendedor.map(({ seller }) => {
        const vendas = vendasPorVendedor.get(seller) ?? [];
        const subtotal = sum(vendas.map(v => v.value));
        const trs = vendas.map(v => {
          const r = enrichSaleForReport(v);
          return `
            <tr>
              <td>${r.date}</td>
              <td>${safe(r.client.nome)}</td>
              <td>${safe(r.client.cpf)}</td>
              <td>${safe(r.client.telefone)}</td>
              <td>${[safe(r.client.endereco), safe(r.client.cidade), safe(r.client.estado)].filter(Boolean).join(" - ")}</td>
              <td>${[safe(r.moto.marca), safe(r.moto.modelo)].filter(Boolean).join(" ")}</td>
              <td>${safe(r.moto.ano)}</td>
              <td>${safe(r.moto.chassi)}</td>
              <td>${safe(r.moto.placa)}</td>
              <td style="text-align:right">${money(r.value)}</td>
            </tr>
          `;
        }).join("");

        return `
          <div class="block">
            <div class="subsection-title">Vendedor: ${safe(seller)} <span class="chip">Subtotal: ${money(subtotal)}</span></div>
            <table class="table">
              <thead>
                <tr>
                  <th>Data</th><th>Cliente</th><th>CPF</th><th>Telefone</th><th>Endereço</th>
                  <th>Moto</th><th>Ano</th><th>Chassi</th><th>Placa</th><th class="num">Valor</th>
                </tr>
              </thead>
              <tbody>${trs || `<tr><td colspan="10" class="muted">Sem vendas deste vendedor no período.</td></tr>`}</tbody>
            </table>
          </div>
        `;
      }).join("");

      if (!blocks) return `<div class="muted">Sem vendas no período.</div>`;
      return `
        <div class="section">
          <div class="section-title">Detalhamento de Vendas por Vendedor</div>
          ${blocks}
        </div>
      `;
    };

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Relatório Financeiro</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #222; }
  .header { text-align:center; margin-bottom: 10px; }
  .title { font-size: 18pt; font-weight: bold; }
  .subtitle { font-size: 10pt; color:#555; }
  .meta { margin: 8px 0 20px; text-align:center; color:#333; }
  .section { margin: 18px 0; page-break-inside: avoid; }
  .section-title { font-weight:bold; font-size: 14pt; margin: 4px 0 10px; border-bottom: 2px solid #000; padding-bottom: 4px; }
  .subsection-title { font-weight: bold; font-size: 12pt; margin: 12px 0 6px; }
  .chip { background:#f1f1f1; border-radius:999px; padding:2px 8px; font-size:10pt; margin-left:8px; }
  .chip-strong { background:#ddd; font-weight:600; }
  .block { margin-bottom: 12px; }
  .muted { color:#666; font-style: italic; }
  .grid-3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
  .card { border:1px solid #000; padding:10px; border-radius:8px; }
  .card h3 { margin:0 0 6px; font-size:12pt; }
  .kpi { font-size: 16pt; font-weight:700; }
  .kpi.ok { color:#0a7a0a; }
  .kpi.warn { color:#9b2c2c; }
  .table { width:100%; border-collapse: collapse; }
  .table th, .table td { border:1px solid #444; padding:6px; vertical-align: top; }
  .table thead th { background:#f3f3f3; }
  .num { text-align:right; }
  .footer-total { text-align:right; font-weight: bold; margin-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div class="title">Relatório Financeiro</div>
    <div class="subtitle">Resumo com Faturamento, Despesas (Loja & Gerais) e Lucro Líquido</div>
    <div class="meta">Período: ${safe(period)} • ${safe(sellerInfo)}</div>
  </div>

  <div class="section">
    <div class="section-title">Resumo Financeiro</div>
    <div class="grid-3">
      <div class="card">
        <h3>Faturamento</h3>
        <div class="kpi">${money(totalFaturamento)}</div>
      </div>
      <div class="card">
        <h3>Despesas</h3>
        <div class="kpi">${money(totalDespesas)}</div>
        <div class="muted">Loja: ${money(subtotalLoja)} • Gerais: ${money(subtotalGerais)}</div>
      </div>
      <div class="card">
        <h3>Lucro Líquido</h3>
        <div class="kpi ${lucroLiquido >= 0 ? "ok" : "warn"}">${money(lucroLiquido)}</div>
      </div>
    </div>
  </div>

  ${renderExpensesTable("Despesas da Loja", lojaPorCategoria, subtotalLoja)}
  ${renderExpensesTable("Despesas Gerais", geraisPorCategoria, subtotalGerais)}

  ${renderSalesDetail()}

  <div class="section">
    <div class="footer-total">Total de Despesas: ${money(totalDespesas)} • Lucro Líquido: ${money(lucroLiquido)}</div>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `relatorio-financeiro-${ts}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
          <div className="flex items-end gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setSellerFilter("__ALL__");
                setDateRange({ from: startOfMonth, to: today });
              }}
            >
              Limpar filtros
            </Button>

            <Button onClick={exportDOCWordLike}>
              Exportar DOCX (Word)
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
  