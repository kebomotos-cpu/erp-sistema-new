"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/guards/require-auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc as fsDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from "recharts";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { DateRange } from "react-day-picker";

// ---------------- Types ----------------
type Moto = {
  id: string;
  marca?: string;
  modelo?: string;
  ano?: string | number;
  placa?: string;
  chassi?: string;
  imageUrl?: string;
  cadastradoPor?: string;
  valorVenda?: number;
  precoVenda?: number;
  valor?: number;
  custoFornecedor?: number;
};

type MotoFS = {
  marca?: string;
  modelo?: string;
  ano?: string | number;
  Ano?: string | number;
  placa?: string;
  placaFinal?: string;
  chassi?: string;
  Chassi?: string;
  imageUrl?: string;
  fotoPrincipal?: string;
  fotos?: string[];
  cadastradoPor?: string;
  CadastradoPor?: string;
  valorVenda?: number;
  precoVenda?: number;
  valor?: number;
  custoFornecedor?: number;
};

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  data: string; // yyyy-mm-dd
  categoria?: string;
  obs?: string;
  motoId?: string | null;
};

type DespesaFS = Omit<Despesa, "id"> & {
  createdAt?: unknown;
  moto?: { modelo?: string; placa?: string | null; chassi?: string | null };
};

type VendaFS = {
  dataVenda?: string;
  vendedorResponsavel?: string;
  placa?: string;
  chassi?: string;
  valorVenda?: number;
};

// Tipagem segura para o snapshot de storehistoryc
type VendaFSRaw = {
  dataVenda?: string;
  data?: string;
  dataRegistro?: string;
  vendedorResponsavel?: string;
  vendedor?: string;
  placa?: string;
  chassi?: string;
  valorVenda?: number | string;
};

// ---------------- Utils ----------------
const BRL = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const parseBR = (s: string) =>
  Number(String(s || "0").replace(/\./g, "").replace(",", ".") || 0);

const monthKey = (iso: string) => (iso || "").slice(0, 7);

const fmtRange = (r?: DateRange) => {
  if (!r?.from && !r?.to) return "Selecione o período";
  const f = r?.from ? r.from.toLocaleDateString("pt-BR") : "...";
  const t = r?.to ? r.to.toLocaleDateString("pt-BR") : "...";
  return `${f} - ${t}`;
};

const inRange = (iso: string, r?: DateRange) => {
  if (!r?.from && !r?.to) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (r?.from && d < new Date(r.from.toDateString())) return false;
  if (r?.to) {
    const limit = new Date(r.to);
    limit.setHours(23, 59, 59, 999);
    if (d > limit) return false;
  }
  return true;
};

// ---------------- Page ----------------
export default function FinanceiroPorMotoPage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [vendas, setVendas] = useState<VendaFS[]>([]);

  // filtros
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [vendedor, setVendedor] = useState<string>("__ALL__");
  const [qDesp, setQDesp] = useState(""); // busca nas despesas

  // paginação cards
  const itemsPerPage = 2;
  const [page, setPage] = useState(1);

  // modais existentes
  const [openCusto, setOpenCusto] = useState<null | Moto>(null);
  const [custoStr, setCustoStr] = useState("");
  const [openDespesa, setOpenDespesa] = useState<null | Moto>(null);
  const [formDesp, setFormDesp] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    categoria: "",
    obs: "",
  });

  // modal despesa geral (loja)
  const [openDespLoja, setOpenDespLoja] = useState(false);
  const [formDespLoja, setFormDespLoja] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    categoria: "Loja",
    obs: "",
  });

  // EXCLUSÃO: estado do alerta
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pedirExcluirDespesa = (id: string) => setConfirmDeleteId(id);

  const excluirDespesa = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteDoc(fsDoc(db, "despesas", confirmDeleteId));
      setDespesas((prev) => prev.filter((d) => d.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast.success("Despesa excluída.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir despesa.");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Motos
        const mSnap = await getDocs(collection(db, "motos"));
        const mList: Moto[] = mSnap.docs.map((d) => {
          const x = d.data() as MotoFS;
          return {
            id: d.id,
            marca: x.marca,
            modelo: x.modelo,
            ano: x.ano ?? x.Ano,
            placa: x.placa ?? x.placaFinal,
            chassi: x.chassi ?? x.Chassi,
            imageUrl:
              x.imageUrl ??
              x.fotoPrincipal ??
              (Array.isArray(x.fotos) ? x.fotos[0] : undefined),
            cadastradoPor: x.cadastradoPor ?? x.CadastradoPor ?? "—",
            valorVenda: x.valorVenda ?? x.precoVenda ?? x.valor ?? 0,
            precoVenda: x.precoVenda,
            valor: x.valor,
            custoFornecedor: x.custoFornecedor ?? 0,
          };
        });
        setMotos(mList);

        // Despesas
        const qDespQ = query(collection(db, "despesas"), orderBy("data", "desc"));
        const dSnap = await getDocs(qDespQ);
        const dList: Despesa[] = dSnap.docs.map((d) => {
          const raw = d.data() as DespesaFS;
          return {
            id: d.id,
            descricao: raw.descricao,
            valor: Number(raw.valor ?? 0),
            data: raw.data,
            categoria: raw.categoria ?? "",
            obs: raw.obs ?? "",
            motoId: raw.motoId ?? null,
          };
        });
        setDespesas(dList);

        // Vendas (para filtros de data + vendedor)
        const vSnap = await getDocs(collection(db, "storehistoryc"));
        const vList: VendaFS[] = vSnap.docs.map((d) => {
          const x = d.data() as Partial<VendaFSRaw>;
          return {
            dataVenda: x.dataVenda ?? x.data ?? x.dataRegistro ?? "",
            vendedorResponsavel: x.vendedorResponsavel ?? x.vendedor ?? "",
            placa: x.placa ?? "",
            chassi: x.chassi ?? "",
            valorVenda: Number(x.valorVenda ?? 0),
          };
        });
        setVendas(vList);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar dados.");
      }
    })();
  }, []);

  // índice de vendas por chassi/placa para filtrar motos
  const salesIndex = useMemo(() => {
    const idxByChassi = new Map<string, VendaFS[]>();
    const idxByPlaca = new Map<string, VendaFS[]>();
    vendas.forEach((v) => {
      const okDate = v.dataVenda ? inRange(v.dataVenda, range) : true;
      const okVend =
        vendedor === "__ALL__"
          ? true
          : (v.vendedorResponsavel || "").trim() === vendedor;
      if (!okDate || !okVend) return;
      const ch = (v.chassi || "").toUpperCase();
      const pl = (v.placa || "").toUpperCase();
      if (ch) idxByChassi.set(ch, [...(idxByChassi.get(ch) || []), v]);
      if (pl) idxByPlaca.set(pl, [...(idxByPlaca.get(pl) || []), v]);
    });
    return { byChassi: idxByChassi, byPlaca: idxByPlaca };
  }, [vendas, range, vendedor]);

  // motos filtradas: só as que têm venda compatível com filtros (ou tudo se nenhum filtro)
  const motosFiltradas = useMemo(() => {
    const hasAnyFilter = !!range?.from || !!range?.to || vendedor !== "__ALL__";
    if (!hasAnyFilter) return motos;

    return motos.filter((m) => {
      const ch = (m.chassi || "").toUpperCase();
      const pl = (m.placa || "").toUpperCase();
      const ok =
        (ch && salesIndex.byChassi.get(ch)?.length) ||
        (pl && salesIndex.byPlaca.get(pl)?.length);
      return !!ok;
    });
  }, [motos, salesIndex, range, vendedor]);

  // paginação
  const pageCount = Math.max(1, Math.ceil(motosFiltradas.length / itemsPerPage));
  const pageItems = motosFiltradas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  // índice motoId -> nome completo (para listar nas despesas)
  const motoIndex = useMemo(() => {
    const map = new Map<string, string>();
    motos.forEach((m) => {
      map.set(
        m.id,
        [m.marca, m.modelo].filter(Boolean).join(" ") ||
          m.placa ||
          m.chassi ||
          "—"
      );
    });
    return map;
  }, [motos]);

  // despesas por moto (APENAS dentro do período filtrado)
  const despesasPorMoto = useMemo(() => {
    const map = new Map<string, number>();
    despesas.forEach((d) => {
      if (!inRange(d.data, range)) return;
      const id = d.motoId ?? "";
      if (!id) return;
      map.set(id, (map.get(id) || 0) + (Number(d.valor) || 0));
    });
    return map;
  }, [despesas, range]);

  // soma despesas gerais (loja) dentro do período
  const despesasGerais = useMemo(
    () =>
      despesas
        .filter((d) => !d.motoId && inRange(d.data, range))
        .reduce((acc, d) => acc + (Number(d.valor) || 0), 0),
    [despesas, range]
  );

  // totais só das motos filtradas (vendidas conforme filtros)
  const totalVenda = useMemo(
    () =>
      motosFiltradas.reduce(
        (acc, m) => acc + (m.valorVenda ?? m.precoVenda ?? m.valor ?? 0),
        0
      ),
    [motosFiltradas]
  );
  const totalDespesasVinculadas = useMemo(
    () => motosFiltradas.reduce((acc, m) => acc + (despesasPorMoto.get(m.id) || 0), 0),
    [motosFiltradas, despesasPorMoto]
  );
  const totalCustos = useMemo(
    () => motosFiltradas.reduce((acc, m) => acc + (m.custoFornecedor ?? 0), 0),
    [motosFiltradas]
  );

  const totalDespesas = totalDespesasVinculadas + despesasGerais;
  const lucroLiquidoGeral = totalVenda - totalDespesas - totalCustos;

  // gráfico por mês (receita / despesa) respeitando período
  const chartData = useMemo(() => {
    const receitaPorMes = new Map<string, number>();
    const despPorMes = new Map<string, number>();

    motosFiltradas.forEach((m) => {
      // Mantido comportamento original: receita no mês atual
      const k = new Date().toISOString().slice(0, 7);
      receitaPorMes.set(
        k,
        (receitaPorMes.get(k) || 0) +
          (m.valorVenda ?? m.precoVenda ?? m.valor ?? 0)
      );
    });

    despesas
      .filter((d) => inRange(d.data, range))
      .forEach((d) => {
        const k = monthKey(d.data);
        if (!k) return;
        despPorMes.set(k, (despPorMes.get(k) || 0) + (d.valor || 0));
      });

    const keys = Array.from(
      new Set([...receitaPorMes.keys(), ...despPorMes.keys()])
    ).sort();
    return keys.map((k) => ({
      month: k,
      receita: receitaPorMes.get(k) || 0,
      despesa: despPorMes.get(k) || 0,
    }));
  }, [motosFiltradas, despesas, range]);

  // despesas filtradas + busca
  const despesasListadas = useMemo(() => {
    const q = qDesp.trim().toLowerCase();
    return despesas
      .filter((d) => inRange(d.data, range))
      .filter((d) => {
        if (!q) return true;
        const textoMoto = d.motoId ? (motoIndex.get(d.motoId) || "") : "";
        return (
          d.descricao.toLowerCase().includes(q) ||
          (d.categoria || "").toLowerCase().includes(q) ||
          textoMoto.toLowerCase().includes(q)
        );
      });
  }, [despesas, range, qDesp, motoIndex]);

  // ações
  const limparFiltros = () => {
    setRange(undefined);
    setVendedor("__ALL__");
    setPage(1);
  };

  const abrirModalCusto = (m: Moto) => {
    setCustoStr(
      (m.custoFornecedor ?? 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })
    );
    setOpenCusto(m);
  };

  const salvarCusto = async () => {
    if (!openCusto) return;
    try {
      const valor = parseBR(custoStr);
      await updateDoc(fsDoc(db, "motos", openCusto.id), {
        custoFornecedor: valor,
      });
      setMotos((list) =>
        list.map((m) =>
          m.id === openCusto.id ? { ...m, custoFornecedor: valor } : m
        )
      );
      setOpenCusto(null);
      toast.success("Custo do fornecedor salvo.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar custo.");
    }
  };

  const abrirModalDespesa = (m: Moto) => {
    setFormDesp({
      descricao: "",
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      categoria: "",
      obs: "",
    });
    setOpenDespesa(m);
  };

  const salvarDespesa = async () => {
    if (!openDespesa) return;
    try {
      const valor = parseBR(formDesp.valor);
      if (!formDesp.descricao || !valor) {
        toast.error("Preencha descrição e valor válido.");
        return;
      }
      await addDoc(collection(db, "despesas"), {
        descricao: formDesp.descricao,
        valor,
        data: formDesp.data,
        categoria: formDesp.categoria || null,
        obs: formDesp.obs || null,
        createdAt: serverTimestamp(),
        motoId: openDespesa.id,
        moto: {
          modelo: [openDespesa.marca, openDespesa.modelo].filter(Boolean).join(" "),
          placa: openDespesa.placa ?? null,
          chassi: openDespesa.chassi ?? null,
        },
      });
      setDespesas((prev) => [
        {
          id: crypto.randomUUID(),
          descricao: formDesp.descricao,
          valor,
          data: formDesp.data,
          categoria: formDesp.categoria || "",
          obs: formDesp.obs || "",
          motoId: openDespesa.id,
        },
        ...prev,
      ]);
      setOpenDespesa(null);
      toast.success("Despesa lançada para a moto.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao lançar despesa.");
    }
  };

  const salvarDespesaLoja = async () => {
    try {
      const valor = parseBR(formDespLoja.valor);
      if (!formDespLoja.descricao || !valor) {
        toast.error("Informe descrição e valor.");
        return;
      }
      await addDoc(collection(db, "despesas"), {
        descricao: formDespLoja.descricao,
        valor,
        data: formDespLoja.data,
        categoria: formDespLoja.categoria || "Loja",
        obs: formDespLoja.obs || null,
        createdAt: serverTimestamp(),
        motoId: null, // <<< garante que é “da loja”
      });
      setDespesas((prev) => [
        {
          id: crypto.randomUUID(),
          descricao: formDespLoja.descricao,
          valor,
          data: formDespLoja.data,
          categoria: formDespLoja.categoria || "Loja",
          obs: formDespLoja.obs || "",
          motoId: null,
        },
        ...prev,
      ]);
      setOpenDespLoja(false);
      toast.success("Despesa da loja lançada.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao lançar despesa da loja.");
    }
  };

  return (
    <RequireAuth roles={["dono"]}>
      <div className="p-0">
        {/* Título */}
        <h1 className="text-3xl font-bold mb-4">Financeiro por Moto</h1>

        {/* Barra de filtros */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Período */}
            <div className="md:col-span-5">
              <Label>Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !range?.from && !range?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fmtRange(range)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Vendedor (mantido comentado; se reativar, reimporte os componentes e reintroduza "vendedores")
            <div className="md:col-span-3">
              <Label>Vendedor</Label>
              <Select
                value={vendedor}
                onValueChange={(v) => {
                  setVendedor(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todos</SelectItem>
                  {vendedores.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {/* Ações */}
            <div className="md:col-span-2">
              <Button variant="outline" className="w-full" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c]"
                onClick={() => setOpenDespLoja(true)}
              >
                Lançar Despesa da Loja
              </Button>
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Total de Venda</div>
            <div className="text-2xl font-bold mt-1">{BRL(totalVenda)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">
              Despesas (motos + loja)
            </div>
            <div className="text-2xl font-bold mt-1">{BRL(totalDespesas)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Custo Fornecedor</div>
            <div className="text-2xl font-bold mt-1">{BRL(totalCustos)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Lucro Líquido</div>
            <div className="text-2xl font-bold mt-1">
              {BRL(lucroLiquidoGeral)}
            </div>
          </Card>
        </div>

        {/* GRÁFICO */}
        <Card className="mt-6 p-5">
          <div className="text-sm text-muted-foreground mb-2">Evolução</div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(v: number | string) => BRL(Number(v))}
                  labelFormatter={(l) => `Mês: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="receita"
                  dot
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="despesa"
                  dot
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Busca + Tabela de despesas do período */}
        <div className="mb-4 mt-5">
          <Input
            placeholder="Buscar por descrição, categoria ou moto..."
            value={qDesp}
            onChange={(e) => setQDesp(e.target.value)}
            className="mb-2 max-w-md"
          />
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Moto</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {despesasListadas.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="p-3">
                      {new Date(d.data).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">{d.descricao}</td>
                    <td className="p-3">
                      <Badge variant={d.motoId ? "secondary" : "outline"}>
                        {d.categoria || (d.motoId ? "—" : "Loja")}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {d.motoId ? (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {motoIndex.get(d.motoId) || "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{BRL(d.valor)}</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => pedirExcluirDespesa(d.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Excluir despesa"
                        title="Excluir despesa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {despesasListadas.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      Nenhuma despesa no período/termos informados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* LISTA DE MOTOS (paginada) */}
        <div className="mt-6 space-y-4">
          {pageItems.map((m) => {
            const venda = m.valorVenda ?? m.precoVenda ?? m.valor ?? 0;
            const despesasMoto = despesasPorMoto.get(m.id) || 0;
            const custo = m.custoFornecedor ?? 0;
            const lucro = venda - despesasMoto - custo;

            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* thumb */}
                  <div className="w-[170px] h-[110px] rounded-md overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt={`${m.modelo}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        sem imagem
                      </span>
                    )}
                  </div>

                  {/* info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {[m.marca, m.modelo].filter(Boolean).join(" ") || "—"}
                        </h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            <strong>Ano:</strong> {m.ano ?? "—"}
                          </div>
                          <div>
                            <strong>Chassi:</strong> {m.chassi ?? "—"}
                          </div>
                          <div>
                            <strong>Placa:</strong> {m.placa ?? "—"}
                          </div>
                          <div>
                            <strong>Cadastrado Por:</strong>{" "}
                            {m.cadastradoPor ?? "—"}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            Despesas: {BRL(despesasMoto)}
                          </Badge>
                          <Badge variant="outline">
                            Custo fornecedor: {BRL(custo)}
                          </Badge>
                          <Badge>Lucro líquido: {BRL(lucro)}</Badge>
                        </div>
                      </div>

                      <div className="text-right min-w-[200px]">
                        <div className="text-sm text-muted-foreground">
                          Valor de Venda
                        </div>
                        <div className="text-xl font-bold">{BRL(venda)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => abrirModalCusto(m)}
                      >
                        Adicionar/Editar Custo
                      </Button>
                      <Button
                        className="bg-[#dc2626] hover:bg-[#b91c1c]"
                        onClick={() => abrirModalDespesa(m)}
                      >
                        Lançar Despesa
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {motosFiltradas.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma moto no período/ vendedor selecionado.
            </Card>
          )}
        </div>

        {/* Paginação */}
        {pageCount > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>

                {Array.from({ length: pageCount }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <PaginationItem key={n}>
                      <PaginationLink
                        isActive={page === n}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* MODAL: custo fornecedor */}
        <Dialog open={!!openCusto} onOpenChange={() => setOpenCusto(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Definir custo do fornecedor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>
                  Moto: {[openCusto?.marca, openCusto?.modelo].filter(Boolean).join(" ")}
                </Label>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  value={custoStr}
                  onChange={(e) => setCustoStr(e.target.value)}
                  placeholder="Ex.: 12.500,00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenCusto(null)}>
                Cancelar
              </Button>
              <Button onClick={salvarCusto}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: despesa vinculada */}
        <Dialog open={!!openDespesa} onOpenChange={() => setOpenDespesa(null)}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Lançar despesa para a moto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>
                  Moto:{" "}
                  {[openDespesa?.marca, openDespesa?.modelo]
                    .filter(Boolean)
                    .join(" ")}{" "}
                  • {openDespesa?.placa ?? openDespesa?.chassi}
                </Label>
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input
                  value={formDesp.descricao}
                  onChange={(e) =>
                    setFormDesp((s) => ({ ...s, descricao: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  value={formDesp.valor}
                  onChange={(e) =>
                    setFormDesp((s) => ({ ...s, valor: e.target.value }))
                  }
                  placeholder="Ex.: 320,00"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formDesp.data}
                  onChange={(e) =>
                    setFormDesp((s) => ({ ...s, data: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Categoria (opcional)</Label>
                <Input
                  value={formDesp.categoria}
                  onChange={(e) =>
                    setFormDesp((s) => ({ ...s, categoria: e.target.value }))
                  }
                  placeholder="Ex.: Oficina, Peças…"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={formDesp.obs}
                  onChange={(e) =>
                    setFormDesp((s) => ({ ...s, obs: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDespesa(null)}>
                Cancelar
              </Button>
              <Button onClick={salvarDespesa}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: despesa da loja */}
        <Dialog open={openDespLoja} onOpenChange={setOpenDespLoja}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Lançar despesa da loja</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input
                  value={formDespLoja.descricao}
                  onChange={(e) =>
                    setFormDespLoja((s) => ({ ...s, descricao: e.target.value }))
                  }
                  placeholder="Ex.: Eletricista, Limpeza, Aluguel…"
                />
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  value={formDespLoja.valor}
                  onChange={(e) =>
                    setFormDespLoja((s) => ({ ...s, valor: e.target.value }))
                  }
                  placeholder="Ex.: 1.200,00"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formDespLoja.data}
                  onChange={(e) =>
                    setFormDespLoja((s) => ({ ...s, data: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  value={formDespLoja.categoria}
                  onChange={(e) =>
                    setFormDespLoja((s) => ({ ...s, categoria: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  rows={3}
                  value={formDespLoja.obs}
                  onChange={(e) =>
                    setFormDespLoja((s) => ({ ...s, obs: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDespLoja(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarDespesaLoja}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ALERTA: confirmar exclusão de despesa */}
        <AlertDialog
          open={!!confirmDeleteId}
          onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. A despesa será removida do histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={excluirDespesa}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequireAuth>
  );
}
