"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

type MotoFS = {
  marca?: string;
  modelo?: string;
  placa?: string;
  placaFinal?: string;
  chassi?: string;
  Chassi?: string;
  imageUrl?: string;
  fotoPrincipal?: string;
  fotos?: string[];
};

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  data: string; // ISO yyyy-mm-dd
  categoria?: string;
  obs?: string;
  createdAt?: Timestamp | null;
  motoId?: string | null;
  moto?: {
    modelo?: string;
    placa?: string | null;
    chassi?: string | null;
  } | null;
};

type DespesaFS = Omit<Despesa, "id">;

// ---------- Utils ----------
const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleDateString("pt-BR");
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
  if (mode === "week") start.setDate(now.getDate() - 6);
  else start.setDate(1);
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

  // deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // despesas
        const qDesp = query(collection(db, "despesas"), orderBy("data", "desc"));
        const snap = await getDocs(qDesp);
        const list: Despesa[] = snap.docs.map((d) => {
          const x = d.data() as DespesaFS;
          return {
            id: d.id,
            descricao: x.descricao,
            valor: Number(x.valor ?? 0),
            data: x.data,
            categoria: x.categoria ?? "",
            obs: x.obs ?? "",
            createdAt: x.createdAt ?? null,
            motoId: x.motoId ?? null,
            moto: x.moto ?? null,
          };
        });

        // <<< NÃO MOSTRAR despesas da loja (motoId === null)
        setDespesas(list.filter((d) => !!d.motoId));

        // motos
        const mSnap = await getDocs(collection(db, "motos"));
        const motosList: Moto[] = mSnap.docs.map((d) => {
          const x = (d.data() || {}) as MotoFS;
          return {
            id: d.id,
            marca: x.marca,
            modelo: x.modelo,
            placa: x.placa ?? x.placaFinal,
            chassi: x.chassi ?? x.Chassi,
            imageUrl:
              x.imageUrl ??
              x.fotoPrincipal ??
              (Array.isArray(x.fotos) ? x.fotos[0] : undefined),
          };
        });
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

      let motoPayload: Despesa["moto"] = null;
      if (form.motoId) {
        const m = motos.find((x) => x.id === form.motoId);
        if (m) {
          motoPayload = {
            modelo: [m.marca, m.modelo].filter(Boolean).join(" "),
            placa: m.placa ?? null,
            chassi: m.chassi ?? null,
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
        moto: motoPayload,
      });

      // otimista — <<< só adiciona no estado se TIVER motoId
      if (form.motoId) {
        setDespesas((prev) => [
          {
            id: crypto.randomUUID(),
            descricao: form.descricao,
            valor: valorNum,
            data: form.data,
            categoria: form.categoria || "",
            obs: form.obs || "",
            createdAt: null,
            motoId: form.motoId,
            moto: motoPayload,
          },
          ...prev,
        ]);
      }

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

  // excluir
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteDoc(doc(db, "despesas", id));
      setDespesas((prev) => prev.filter((x) => x.id !== id));
      toast.success("Despesa excluída.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir a despesa.");
    } finally {
      setDeletingId(null);
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
                  placeholder="Ex.: Peças, Funilaria, Taxa..."
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
                <Label>Vincular a uma moto (obrigatório)</Label>
                <Select
                  value={form.motoId ?? undefined}
                  onValueChange={(v) => setForm((s) => ({ ...s, motoId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a moto" />
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
          <div className="text-2xl font-bold mt-1">{filtered.length}</div>
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
        <div className="text-sm text-muted-foreground mb-2">Evolução no Período</div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number | string) => BRL(Number(v))} />
              <Line type="monotone" dataKey="total" dot strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Busca */}
      <div className="mt-6 flex items-center justify-between">
        <Input
          className="w-[320px]"
          placeholder="Buscar por descrição, categoria ou moto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">{fmtDate(d.data)}</TableCell>
                <TableCell className="max-w-[380px] truncate">{d.descricao}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.categoria ? <Badge variant="secondary">{d.categoria}</Badge> : "-"}
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
                <TableCell className="text-right font-medium">{BRL(d.valor)}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === d.id}
                      >
                        {deletingId === d.id ? "Excluindo…" : "Excluir"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esta despesa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso removerá o lançamento
                          permanentemente do seu banco de dados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(d.id)}>
                          Confirmar exclusão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm py-8">
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
