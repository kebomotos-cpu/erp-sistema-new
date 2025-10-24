"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  documentId,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "sonner";
import { gerarContratoFirebase } from "@/app/contract/generate/firebaseContracts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

/* ---------- helpers de data p/ padrão BR ---------- */
const pad2 = (n: number) => String(n).padStart(2, "0");
const ymdToBR = (ymd: string) => {
  const [y, m, d] = (ymd || "").split("-").map(Number);
  if (!y || !m || !d) return ymd || "";
  return `${pad2(d)}/${pad2(m)}/${y}`;
};
// Parser local (evita UTC): "YYYY-MM-DD" -> Date(y, m-1, d)
const parseYMDLocal = (ymd: string) => {
  const [y, m, d] = (ymd || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

type Venda = {
  id: string;
  clienteNome: string;
  cpf: string;
  modelo: string;
  marca: string;
  cor: string;
  ano: string;
  placa: string;
  renavam: string;
  chassi: string;
  km: string;
  formaPagamento: string;
  entrada: string;
  dataVenda: string; // "YYYY-MM-DD" (local)
  valorVenda: number;
  observacao?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  vendedorResponsavel?: string;
  detalhesPagamento?: string;
  dataHoraEmissao?: string;
  foto?: string;
};

type ClienteMin = {
  cpf?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

type MotoMin = {
  chassi?: string;
  placa?: string;
  foto?: string;
};

const norm = (s?: string) =>
  (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const firstNonEmpty = (...vals: (string | undefined)[]) => {
  for (const v of vals) if (v && v.trim()) return v.trim();
  return undefined;
};

/* ---------- helpers de parcelas ---------- */
const brToNumber = (s?: string | number) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  return Number(s.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
};
const moneyBR = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const clampDay = (date: Date, day: number) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.min(Math.max(1, day), d);
};
type Parcela = { parcela: number; vencimento: string; valor: number; especie: string };

// ⚠️ Aqui a gente PARSEIA A STRING "YYYY-MM-DD" EM LOCALTIME
const gerarParcelas = (opts: {
  dataVendaYMD: string;   // <- mudou o nome só pra lembrar que é YMD local
  qtd: number;
  valorParcela: number;
  especie: string;        // BOLETO | PIX | CARTÃO etc
  diaVenc: number;        // 1..31
  valorEntrada?: number;
}): Parcela[] => {
  const { dataVendaYMD, qtd, valorParcela, especie, diaVenc, valorEntrada } = opts;

  const base = parseYMDLocal(dataVendaYMD); // ✅ nada de UTC
  const list: Parcela[] = [];
  let idx = 1;

  if (valorEntrada && valorEntrada > 0) {
    list.push({
      parcela: idx++,
      vencimento: `${pad2(base.getDate())}/${pad2(base.getMonth() + 1)}/${base.getFullYear()}`,
      valor: valorEntrada,
      especie: "ENTRADA",
    });
  }

  for (let i = 1; i <= qtd; i++) {
    const ref = new Date(base);
    ref.setMonth(ref.getMonth() + i);
    const day = clampDay(new Date(ref.getFullYear(), ref.getMonth(), 1), diaVenc);
    const due = new Date(ref.getFullYear(), ref.getMonth(), day);

    list.push({
      parcela: idx++,
      vencimento: `${pad2(day)}/${pad2(due.getMonth() + 1)}/${due.getFullYear()}`,
      valor: valorParcela,
      especie,
    });
  }

  return list;
};

const parcelasToHtmlTable = (parcelas: Parcela[]) => `
<table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
  <thead>
    <tr>
      <th style="text-align:center;">PARCELA</th>
      <th style="text-align:center;">VENCIMENTO</th>
      <th style="text-align:center;">VALOR</th>
      <th style="text-align:center;">ESPÉCIE</th>
    </tr>
  </thead>
  <tbody>
    ${parcelas
      .map(
        (p) => `
      <tr>
        <td style="text-align:center;">${p.parcela}</td>
        <td style="text-align:center;">${p.vencimento}</td>
        <td style="text-align:right; white-space:nowrap;">${moneyBR(p.valor)}</td>
        <td style="text-align:center;">${p.especie}</td>
      </tr>`
      )
      .join("")}
  </tbody>
</table>`;

/* -------------------- componente -------------------- */
export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [modalDominioOpen, setModalDominioOpen] = useState(false);
  const [modalContratoOpen, setModalContratoOpen] = useState(false);

  const [antigoDono, setAntigoDono] = useState({ nome: "", cpf: "" });
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);

  // parcelas
  const [qtdParcelas, setQtdParcelas] = useState<number>(12);
  const [formaParcela, setFormaParcela] = useState<string>("BOLETO");
  const [valorParcela, setValorParcela] = useState<string>("715,00");
  const [diaVenc, setDiaVenc] = useState<number>(10);
  const [valorEntrada, setValorEntrada] = useState<string>("");

  const [detalhesPagamento, setDetalhesPagamento] = useState(
    "O COMPRADOR obriga-se a efetuar o pagamento conforme quadro de parcelas abaixo."
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const vendasPaginadas = vendas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // excluir
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<Venda | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vendasSnap = await getDocs(
          query(
            collection(db, "storehistoryc"),
            orderBy("dataVenda", "desc"),
            orderBy(documentId(), "desc")
          )
        );

        const vendasList = vendasSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Venda, "id">),
        })) as Venda[];

        const clientesSnap = await getDocs(collection(db, "clientes"));
        const byCpf = new Map<string, ClienteMin>();
        clientesSnap.docs.forEach((docu) => {
          const c = docu.data() as ClienteMin;
          if (c?.cpf) byCpf.set(String(c.cpf).replace(/\D/g, ""), c);
        });

        const motosSnap = await getDocs(collection(db, "motos"));
        const byChassi = new Map<string, MotoMin>();
        const byPlaca = new Map<string, MotoMin>();
        motosSnap.docs.forEach((docu) => {
          const m = docu.data() as MotoMin;
          if (m?.chassi) byChassi.set(norm(m.chassi), m);
          if (m?.placa) byPlaca.set(norm(m.placa), m);
        });

        const merged = vendasList.map((v) => {
          const cpfKey = String(v.cpf ?? "").replace(/\D/g, "");
          const cli = byCpf.get(cpfKey);
          const motoMatch =
            byChassi.get(norm(v.chassi)) ?? byPlaca.get(norm(v.placa));
          const fotoFinal = firstNonEmpty(v.foto, motoMatch?.foto, "/moto.jpg");
          return {
            ...v,
            endereco: firstNonEmpty(v.endereco, cli?.endereco, ""),
            bairro: firstNonEmpty(v.bairro, cli?.bairro, ""),
            cidade: firstNonEmpty(v.cidade, cli?.cidade, ""),
            estado: firstNonEmpty(v.estado, cli?.estado, ""),
            foto: fotoFinal,
          };
        });

        merged.sort((a, b) => {
          if (a.dataVenda !== b.dataVenda) return b.dataVenda.localeCompare(a.dataVenda);
          return b.id.localeCompare(a.id);
        });

        setVendas(merged);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar vendas.");
      }
    };
    fetchData();
  }, []);

  const excluirVenda = async (id: string) => {
    try {
      setExcluindo(true);
      await deleteDoc(doc(db, "storehistoryc", id));
      setVendas((prev) => {
        const nova = prev.filter((v) => v.id !== id);
        const totalPages = Math.max(1, Math.ceil(nova.length / itemsPerPage));
        setCurrentPage((p) => Math.min(p, totalPages));
        return nova;
      });
      toast.success("Venda excluída com sucesso.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir a venda.");
    } finally {
      setExcluindo(false);
      setModalExcluirOpen(false);
      setVendaParaExcluir(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-[#dc2626]">Histórico de Vendas</h1>

      <div className="grid gap-4">
        {vendasPaginadas.length === 0 && (
          <p className="text-muted-foreground">Nenhuma venda registrada.</p>
        )}

        {vendasPaginadas.map((venda) => (
          <Card key={venda.id} className="p-6">
            <div className="flex gap-6 items-start">
              <div className="w-48 h-32 bg-muted rounded-md overflow-hidden shrink-0">
                {venda.foto && venda.foto.trim().length > 0 ? (
                  <img src={venda.foto} alt={venda.modelo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Foto</div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-lg">{venda.clienteNome}</h3>
                <p className="text-sm text-muted-foreground">
                  {venda.modelo} — {venda.placa}
                </p>
                <p className="text-sm text-muted-foreground">
                  {/* ✅ mostra no padrão brasileiro */}
                  {ymdToBR(venda.dataVenda)} — R{"$ "}
                  {venda.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={async () => await gerarContratoFirebase(venda, "instrumentoLiberacao")}>
                  Instrumento de Liberação
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    await gerarContratoFirebase(
                      {
                        ...venda,
                        dataHoraEmissao: new Date().toLocaleString("pt-BR", {
                          dateStyle: "full",
                          timeStyle: "short",
                        }),
                      },
                      "termoEntrega"
                    );
                    toast.success("Termo de Entrega emitido.");
                  }}
                >
                  Termo de Entrega
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setVendaSelecionada(venda);
                    setValorEntrada(venda?.entrada ?? "");
                    setModalContratoOpen(true);
                  }}
                >
                  Contrato Loja
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setVendaSelecionada(venda);
                    setModalDominioOpen(true);
                  }}
                >
                  Reserva de Domínio
                </Button>

                <Button variant="outline" onClick={async () => await gerarContratoFirebase(venda, "vendaRepasse")}>
                  Contrato de Repasse
                </Button>

                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    setVendaParaExcluir(venda);
                    setModalExcluirOpen(true);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reserva de Domínio */}
      <Dialog open={modalDominioOpen} onOpenChange={setModalDominioOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dados do Antigo Dono</DialogTitle></DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome</Label>
              <Input value={antigoDono.nome} onChange={(e) => setAntigoDono({ ...antigoDono, nome: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={antigoDono.cpf} onChange={(e) => setAntigoDono({ ...antigoDono, cpf: e.target.value })} />
            </div>

            <Button
              onClick={async () => {
                if (!antigoDono.nome || !antigoDono.cpf) {
                  toast.error("Preencha o nome e CPF do antigo dono.");
                  return;
                }
                if (!vendaSelecionada) return;

                await gerarContratoFirebase(
                  { ...vendaSelecionada, vendedorResponsavel: `${antigoDono.nome} - CPF ${antigoDono.cpf}` },
                  "reservaDominio"
                );

                setModalDominioOpen(false);
                setAntigoDono({ nome: "", cpf: "" });
              }}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              Emitir Documento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contrato Loja (parcelas) */}
      <Dialog open={modalContratoOpen} onOpenChange={setModalContratoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Condições de Pagamento (Contrato Loja)</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <Label>Mensagem (opcional)</Label>
              <textarea
                value={detalhesPagamento}
                onChange={(e) => setDetalhesPagamento(e.target.value)}
                className="w-full min-h-[90px] border rounded-md p-2 text-sm"
              />
            </div>

            <div>
              <Label>Quantidade de parcelas</Label>
              <Input type="number" min={1} value={qtdParcelas} onChange={(e) => setQtdParcelas(parseInt(e.target.value || "1", 10))} />
            </div>

            <div>
              <Label>Forma de pagamento das parcelas</Label>
              <Select value={formaParcela} onValueChange={setFormaParcela}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOLETO">BOLETO</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CARTÃO">CARTÃO</SelectItem>
                  <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                  <SelectItem value="PROMISSÓRIA">PROMISSÓRIA</SelectItem>
                  <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor de cada parcela (R$)</Label>
              <Input placeholder="Ex: 715,00" value={valorParcela} onChange={(e) => setValorParcela(e.target.value)} />
            </div>

            <div>
              <Label>Dia do vencimento</Label>
              <Input type="number" min={1} max={31} value={diaVenc} onChange={(e) => setDiaVenc(parseInt(e.target.value || "10", 10))} />
            </div>

            <div>
              <Label>Valor de entrada (opcional)</Label>
              <Input placeholder="Ex: 13.000,00" value={valorEntrada} onChange={(e) => setValorEntrada(e.target.value)} />
            </div>
          </div>

          <Button
            onClick={async () => {
              if (!vendaSelecionada) return;

              const lista = gerarParcelas({
                dataVendaYMD: vendaSelecionada.dataVenda, // ✅ string local
                qtd: Math.max(1, Number(qtdParcelas || 1)),
                valorParcela: brToNumber(valorParcela),
                especie: formaParcela,
                diaVenc: Math.min(31, Math.max(1, Number(diaVenc || 10))),
                valorEntrada: brToNumber(valorEntrada || vendaSelecionada.entrada),
              });

              const parcelasTabelaHtml = parcelasToHtmlTable(lista);

              await gerarContratoFirebase(
                {
                  ...vendaSelecionada,
                  endereco: vendaSelecionada.endereco ?? "",
                  bairro: vendaSelecionada.bairro ?? "",
                  cidade: vendaSelecionada.cidade ?? "",
                  estado: vendaSelecionada.estado ?? "",
                  detalhesPagamento,
                  dataHoraEmissao: new Date().toLocaleString("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "short",
                  }),
                  parcelas: lista,
                  parcelasTabelaHtml,
                },
                "termoContrato"
              );

              toast.success("Contrato Loja emitido com a tabela de parcelas.");
              setModalContratoOpen(false);
            }}
            className="w-full mt-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            Confirmar e Emitir Contrato
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={modalExcluirOpen} onOpenChange={setModalExcluirOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir esta venda?</p>
            {vendaParaExcluir && (
              <div className="text-sm border rounded-md p-3">
                <div><span className="font-medium">Cliente:</span> {vendaParaExcluir.clienteNome}</div>
                <div><span className="font-medium">Veículo:</span> {vendaParaExcluir.modelo} — {vendaParaExcluir.placa}</div>
                <div><span className="font-medium">Data:</span> {ymdToBR(vendaParaExcluir.dataVenda)}</div> {/* ✅ BR aqui */}
                <div>
                  <span className="font-medium">Valor:</span>{" "}
                  R$ {vendaParaExcluir.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalExcluirOpen(false)} disabled={excluindo}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => vendaParaExcluir && excluirVenda(vendaParaExcluir.id)} disabled={excluindo}>
                {excluindo ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paginação */}
      <div className="flex justify-center mt-6">
        {Array.from({ length: Math.ceil(vendas.length / itemsPerPage) }).map((_, index) => (
          <Button
            key={index}
            variant={index + 1 === currentPage ? "default" : "outline"}
            className="mx-1"
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}
