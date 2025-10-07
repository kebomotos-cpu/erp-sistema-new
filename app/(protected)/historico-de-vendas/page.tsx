"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { collection, getDocs } from "firebase/firestore";
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
  entrada: string;           // pode vir como "5.000,00" etc
  dataVenda: string;         // "YYYY-MM-DD"
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
  for (const v of vals) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
};

// ----------------- helpers de parcelas -----------------

const brToNumber = (s?: string | number) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  // remove R$, pontos de milhar e troca vírgula por ponto
  return Number(
    s.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
  ) || 0;
};

const moneyBR = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const clampDay = (date: Date, day: number) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); // último dia do mês alvo
  return Math.min(Math.max(1, day), d);
};

type Parcela = { parcela: number; vencimento: string; valor: number; especie: string };

const gerarParcelas = (opts: {
  dataVendaISO: string;
  qtd: number;
  valorParcela: number;
  especie: string;     // BOLETO | PIX | CARTÃO etc
  diaVenc: number;     // 1..31
  valorEntrada?: number;
}): Parcela[] => {
  const { dataVendaISO, qtd, valorParcela, especie, diaVenc, valorEntrada } = opts;
  const base = new Date(dataVendaISO);
  const list: Parcela[] = [];
  let idx = 1;

  // Se tiver entrada, entra como parcela 1 (ESPECIE = ENTRADA)
  if (valorEntrada && valorEntrada > 0) {
    list.push({
      parcela: idx++,
      vencimento: `${base.getDate()}/${base.getMonth() + 1}/${base.getFullYear()}`, // dia da venda
      valor: valorEntrada,
      especie: "ENTRADA",
    });
  }

  // Demais parcelas mensais
  // primeira parcela para o mês seguinte no dia escolhido (ajusta para último dia quando necessário)
  for (let i = 1; i <= qtd; i++) {
    const ref = new Date(base);
    ref.setMonth(ref.getMonth() + i);
    const day = clampDay(new Date(ref.getFullYear(), ref.getMonth(), 1), diaVenc);
    const due = new Date(ref.getFullYear(), ref.getMonth(), day);

    list.push({
      parcela: idx++,
      vencimento: `${day}/${due.getMonth() + 1}/${due.getFullYear()}`,
      valor: valorParcela,
      especie,
    });
  }

  return list;
};


const parcelasToHtmlTable = (parcelas: Parcela[]) => {
  return `
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
        <td style="text-align:right; white-space:nowrap;">R$ ${(p.valor)}</td>
        <td style="text-align:center;">${p.especie}</td>
      </tr>`
      )
      .join("")}
  </tbody>
</table>`;
};


export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [modalDominioOpen, setModalDominioOpen] = useState(false);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [antigoDono, setAntigoDono] = useState({ nome: "", cpf: "" });
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);

  // NOVOS CAMPOS DO TERMO
  const [qtdParcelas, setQtdParcelas] = useState<number>(12);
  const [formaParcela, setFormaParcela] = useState<string>("BOLETO");
  const [valorParcela, setValorParcela] = useState<string>("715,00");
  const [diaVenc, setDiaVenc] = useState<number>(10);
  const [valorEntrada, setValorEntrada] = useState<string>(""); // opcional

  const [detalhesPagamento, setDetalhesPagamento] = useState(
    "Obrigando-se o COMPRADOR a efetuar o pagamento conforme quadro de parcelas abaixo."
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const vendasPaginadas = vendas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) vendas
        const vendasSnap = await getDocs(collection(db, "storehistoryc"));
        const vendasList = vendasSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Venda, "id">),
        })) as Venda[];

        // 2) clientes (endereços)
        const clientesSnap = await getDocs(collection(db, "clientes"));
        const byCpf = new Map<string, ClienteMin>();
        clientesSnap.docs.forEach((doc) => {
          const c = doc.data() as ClienteMin;
          if (c?.cpf) byCpf.set(String(c.cpf).replace(/\D/g, ""), c);
        });

        // 3) motos (fotos)
        const motosSnap = await getDocs(collection(db, "motos"));
        const byChassi = new Map<string, MotoMin>();
        const byPlaca = new Map<string, MotoMin>();
        motosSnap.docs.forEach((doc) => {
          const m = doc.data() as MotoMin;
          if (m?.chassi) byChassi.set(norm(m.chassi), m);
          if (m?.placa) byPlaca.set(norm(m.placa), m);
        });

        // merge endereço + foto
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

        // ordenar por dataVenda desc (fallback id desc)
        merged.sort((a, b) => {
          const ad = a.dataVenda ? new Date(a.dataVenda).getTime() : 0;
          const bd = b.dataVenda ? new Date(b.dataVenda).getTime() : 0;
          if (ad !== bd) return bd - ad;
          return a.id < b.id ? 1 : -1;
        });

        setVendas(merged);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar vendas.");
      }
    };
    fetchData();
  }, []);

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
              {/* imagem da moto */}
              <div className="w-48 h-32 bg-muted rounded-md overflow-hidden shrink-0">
                {venda.foto && venda.foto.trim().length > 0 ? (
                  <img
                    src={venda.foto}
                    alt={venda.modelo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Foto
                  </div>
                )}
              </div>

              {/* info venda */}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{venda.clienteNome}</h3>
                <p className="text-sm text-muted-foreground">
                  {venda.modelo} — {venda.placa}
                </p>
                <p className="text-sm text-muted-foreground">
                  {venda.dataVenda} — R{"$ "}
                  {venda.valorVenda.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* ações */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={async () =>
                    await gerarContratoFirebase(venda, "instrumentoLiberacao")
                  }
                >
                  Instrumento de Liberação
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setVendaSelecionada(venda);
                    // defaults do modal
                    setValorEntrada(venda?.entrada ?? "");
                    setModalEntregaOpen(true);
                  }}
                >
                  Termo de Entrega
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

                <Button
                  variant="outline"
                  onClick={async () =>
                    await gerarContratoFirebase(venda, "termoContrato")
                  }
                >
                  Contrato Loja
                </Button>

                <Button
                  variant="outline"
                  onClick={async () =>
                    await gerarContratoFirebase(venda, "vendaRepasse")
                  }
                >
                  Contrato de Repasse
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Reserva de Domínio */}
      <Dialog open={modalDominioOpen} onOpenChange={setModalDominioOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dados do Antigo Dono</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: João Almeida"
                value={antigoDono.nome}
                onChange={(e) =>
                  setAntigoDono({ ...antigoDono, nome: e.target.value })
                }
              />
            </div>

            <div>
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={antigoDono.cpf}
                onChange={(e) =>
                  setAntigoDono({ ...antigoDono, cpf: e.target.value })
                }
              />
            </div>

            <Button
              onClick={async () => {
                if (!antigoDono.nome || !antigoDono.cpf) {
                  toast.error("Preencha o nome e CPF do antigo dono.");
                  return;
                }
                if (!vendaSelecionada) return;

                await gerarContratoFirebase(
                  {
                    ...vendaSelecionada,
                    vendedorResponsavel: `${antigoDono.nome} - CPF ${antigoDono.cpf}`,
                  },
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

      {/* Modal Termo de Entrega */}
      <Dialog open={modalEntregaOpen} onOpenChange={setModalEntregaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>

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
              <Input
                type="number"
                min={1}
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(parseInt(e.target.value || "1", 10))}
              />
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
              <Input
                placeholder="Ex: 715,00"
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)}
              />
            </div>

            <div>
              <Label>Dia do vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={diaVenc}
                onChange={(e) => setDiaVenc(parseInt(e.target.value || "10", 10))}
              />
            </div>

            <div>
              <Label>Valor de entrada (opcional)</Label>
              <Input
                placeholder="Ex: 13.000,00"
                value={valorEntrada}
                onChange={(e) => setValorEntrada(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={async () => {
              if (!vendaSelecionada) return;

              // gera estrutura de parcelas + html pronto
              const lista = gerarParcelas({
                dataVendaISO: vendaSelecionada.dataVenda,
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

                  // >>> dados para o template
                  parcelas: lista,                 // caso o template renderize em loop
                  parcelasTabelaHtml,              // caso prefira inserir HTML direto
                },
                "termoEntrega"
              );

              toast.success("Documento gerado com a tabela de parcelas.");
              setModalEntregaOpen(false);
            }}
            className="w-full mt-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            Confirmar e Emitir Documento
          </Button>
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
