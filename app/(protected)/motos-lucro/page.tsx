"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/guards/require-auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// ---------------- Utils ----------------
const BRL = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const parseBR = (s: string) =>
  Number(String(s || "0").replace(/\./g, "").replace(",", ".") || 0);

const monthKey = (iso: string) => (iso || "").slice(0, 7);

// ---------------- Page ----------------
export default function FinanceiroPorMotoPage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);

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
        const qDesp = query(collection(db, "despesas"), orderBy("data", "desc"));
        const dSnap = await getDocs(qDesp);
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
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar dados.");
      }
    })();
  }, []);

  const despesasPorMoto = useMemo(() => {
    const map = new Map<string, number>();
    despesas.forEach((d) => {
      const id = d.motoId ?? "";
      if (!id) return;
      map.set(id, (map.get(id) || 0) + (Number(d.valor) || 0));
    });
    return map;
  }, [despesas]);

  const totalVenda = useMemo(
    () =>
      motos.reduce(
        (acc, m) => acc + (m.valorVenda ?? m.precoVenda ?? m.valor ?? 0),
        0
      ),
    [motos]
  );
  const totalDespesas = useMemo(
    () => Array.from(despesasPorMoto.values()).reduce((a, b) => a + b, 0),
    [despesasPorMoto]
  );
  const totalCustos = useMemo(
    () => motos.reduce((acc, m) => acc + (m.custoFornecedor ?? 0), 0),
    [motos]
  );
  const lucroLiquidoGeral = totalVenda - totalDespesas - totalCustos;

  const chartData = useMemo(() => {
    const receitaPorMes = new Map<string, number>();
    const despPorMes = new Map<string, number>();
    const nowKey = new Date().toISOString().slice(0, 7);
    receitaPorMes.set(nowKey, (receitaPorMes.get(nowKey) || 0) + totalVenda);

    despesas.forEach((d) => {
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
  }, [despesas, totalVenda]);

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
          modelo: [openDespesa.marca, openDespesa.modelo]
            .filter(Boolean)
            .join(" "),
          placa: openDespesa.placa ?? null,
          chassi: openDespesa.chassi ?? null,
        },
      });
      // otimista
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

  return (
    <RequireAuth roles={["dono"]}>
      <div className="p-0">
        {/* DASHBOARD */}
        <h1 className="text-3xl font-bold mb-6">Financeiro por Moto</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Total de Venda</div>
            <div className="text-2xl font-bold mt-1">{BRL(totalVenda)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Total de Despesas</div>
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

        {/* LISTA DE MOTOS */}
        <div className="mt-6 space-y-4">
          {motos.map((m) => {
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

          {motos.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma moto no estoque.
            </Card>
          )}
        </div>

        {/* MODAL: custo fornecedor */}
        <Dialog open={!!openCusto} onOpenChange={() => setOpenCusto(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Definir custo do fornecedor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>
                  Moto:{" "}
                  {[openCusto?.marca, openCusto?.modelo].filter(Boolean).join(" ")}
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
      </div>
    </RequireAuth>
  );
}
