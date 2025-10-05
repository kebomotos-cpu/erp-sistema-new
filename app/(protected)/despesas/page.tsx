"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// ---------- Types ----------
type Moto = {
  id: string;
  marca?: string;
  modelo?: string;
  placa?: string;
  chassi?: string;
  imageUrl?: string;
};

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  data: string; // ISO yyyy-mm-dd
  categoria?: string;
  obs?: string;
  createdAt?: any;

  motoId?: string;
  moto?: {
    modelo?: string;
    placa?: string;
    chassi?: string;
  };
};

// ---------- Utils ----------
const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
};

// agrupa yyyy-mm → soma
const groupMonthly = (list: Despesa[]) => {
  const map = new Map<string, number>();
  list.forEach((d) => {
    const key = (d.data || "").slice(0, 7); // yyyy-mm
    if (!key) return;
    map.set(key, (map.get(key) || 0) + (d.valor || 0));
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }));
};

// filtra por semana/mês corrente
function filterByRange(list: Despesa[], mode: "week" | "month") {
  const now = new Date();
  const start = new Date(now);
  if (mode === "week") {
    start.setDate(now.getDate() - 6);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);

  return list.filter((d) => {
    const dt = new Date(d.data);
    return !isNaN(+dt) && dt >= start && dt <= now;
  });
}

// ---------- Page ----------
export default function DespesasGerais() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [range, setRange] = useState<"week" | "month">("month");
  const [search, setSearch] = useState("");

  // modal state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    descricao: string;
    valor: string;
    data: string;
    categoria: string;
    obs: string;
    motoId: string | undefined; // optional
  }>({
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    categoria: "",
    obs: "",
    motoId: undefined,
  });

  useEffect(() => {
    (async () => {
      try {
        const qDesp = query(collection(db, "despesas"), orderBy("data", "desc"));
        const snap = await getDocs(qDesp);
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Despesa[];
        setDespesas(list);

        const mSnap = await getDocs(collection(db, "motos"));
        const motosList = mSnap.docs.map((d) => ({
          id: d.id,
          marca: (d.data() as any).marca,
          modelo: (d.data() as any).modelo,
          placa: (d.data() as any).placa || (d.data() as any).placaFinal,
          chassi: (d.data() as any).chassi || (d.data() as any).Chassi,
          imageUrl:
            (d.data() as any).imageUrl ||
            (d.data() as any).fotoPrincipal ||
            (Array.isArray((d.data() as any).fotos) && (d.data() as any).fotos[0]) ||
            undefined,
        })) as Moto[];
        setMotos(motosList);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar despesas.");
      }
    })();
  }, []);

  // dados filtrados
  const filtered = useMemo(() => {
    const base = filterByRange(despesas, range);
    if (!search.trim()) return base;
    const s = search.toLowerCase();
    return base.filter((d) => {
      const motoTxt = `${d.moto?.modelo ?? ""} ${d.moto?.placa ?? ""} ${d.moto?.chassi ?? ""}`;
      return (
        d.descricao?.toLowerCase().includes(s) ||
        d.categoria?.toLowerCase().includes(s) ||
        motoTxt.toLowerCase().includes(s)
      );
    });
  }, [despesas, range, search]);

  // métricas
  const total = useMemo(
    () => filtered.reduce((acc, d) => acc + (Number(d.valor) || 0), 0),
    [filtered]
  );
  const qtd = filtered.length;
  const ticket = qtd ? total / qtd : 0;
  const chartData = useMemo(() => groupMonthly(filtered), [filtered]);

  // salvar
  const handleSave = async () => {
    try {
      const valorNum = Number(form.valor.replace(/\./g, "").replace(",", "."));
      if (!form.descricao || isNaN(valorNum)) {
        toast.error("Preencha descrição e valor válido.");
        return;
      }

      let motoPayload: Despesa["moto"] | undefined = undefined;
      if (form.motoId) {
        const m = motos.find((x) => x.id === form.motoId);
        if (m) {
          motoPayload = {
            modelo: [m.marca, m.modelo].filter(Boolean).join(" "),
            placa: m.placa,
            chassi: m.chassi,
          };
        }
      }

      await addDoc(collection(db, "despesas"), {
        descricao: form.descricao,
        valor: valorNum,
        data: form.data,
        categoria: form.categoria || null,
        obs: form.obs || null,
        createdAt: serverTimestamp(),
        motoId: form.motoId ?? null,
        moto: motoPayload ?? null,
      });

      // otimista
      setDespesas((prev) => [
        {
          id: crypto.randomUUID(),
          descricao: form.descricao,
          valor: valorNum,
          data: form.data,
          categoria: form.categoria || "",
          obs: form.obs || "",
          motoId: form.motoId,
          moto: motoPayload,
        },
        ...prev,
      ]);

      setOpen(false);
      setForm({
        descricao: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10),
        categoria: "",
        obs: "",
        motoId: undefined,
      });
      toast.success("Despesa lançada.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao lançar despesa.");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Despesas Gerais</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#dc2626] hover:bg-[#b91c1c]">
              Lançar Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle>Nova Despesa</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, descricao: e.target.value }))
                  }
                  placeholder="Ex.: Peças, Funilaria, Taxa, Aluguel..."
                />
              </div>

              <div>
                <Label>Valor</Label>
                <Input
                  value={form.valor}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, valor: e.target.value }))
                  }
                  placeholder="Ex.: 350,00"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, data: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Categoria (opcional)</Label>
                <Input
                  value={form.categoria}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, categoria: e.target.value }))
                  }
                  placeholder="Ex.: Oficina, Taxas, Mercado, Energia..."
                />
              </div>

              <div>
                <Label>Vincular a uma moto (opcional)</Label>
                <Select
                  value={form.motoId ?? undefined}
                  onValueChange={(v) => setForm((s) => ({ ...s, motoId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {[m.marca, m.modelo].filter(Boolean).join(" ")} •{" "}
                        {m.placa ?? m.chassi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.obs}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, obs: e.target.value }))
                  }
                  placeholder="Opcional"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Total de Despesas</div>
          <div className="text-2xl font-bold mt-1">{BRL(total)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Ticket Médio</div>
          <div className="text-2xl font-bold mt-1">{BRL(ticket)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Lançamentos</div>
          <div className="text-2xl font-bold mt-1">{qtd}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground">Período</div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant={range === "week" ? "default" : "outline"}
              onClick={() => setRange("week")}
            >
              Semana
            </Button>
            <Button
              size="sm"
              variant={range === "month" ? "default" : "outline"}
              onClick={() => setRange("month")}
            >
              Mês
            </Button>
          </div>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="mt-6 p-5">
        <div className="text-sm text-muted-foreground mb-2">
          Evolução no Período
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: any) => BRL(Number(v))} />
              <Line
                type="monotone"
                dataKey="total"
                dot
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Filtros de busca */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            className="w-[320px]"
            placeholder="Buscar por descrição, categoria ou moto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <Card className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Moto</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">
                  {fmtDate(d.data)}
                </TableCell>
                <TableCell className="max-w-[380px] truncate">
                  {d.descricao}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.categoria ? (
                    <Badge variant="secondary">{d.categoria}</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.moto ? (
                    <Badge variant="outline">
                      {d.moto.modelo} • {d.moto.placa ?? d.moto.chassi}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {BRL(d.valor)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm py-8">
                  Nenhuma despesa neste período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
