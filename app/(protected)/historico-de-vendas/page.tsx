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
  dataVenda: string; // "YYYY-MM-DD"
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

export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [modalDominioOpen, setModalDominioOpen] = useState(false);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [antigoDono, setAntigoDono] = useState({ nome: "", cpf: "" });
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [detalhesPagamento, setDetalhesPagamento] = useState(
    "Obrigando-se o COMPRADOR a efetuar o pagamento nos seguintes prazos e valores: entrada de R$5.000,00 (cinco mil) no pix. + 6 (seis) de R$600,00 (seiscentos reais)"
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
                  {venda.dataVenda} — R$ {venda.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* ações */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={async () => await gerarContratoFirebase(venda, "instrumentoLiberacao")}
                >
                  Instrumento de Liberação
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setVendaSelecionada(venda);
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
                  onClick={async () => await gerarContratoFirebase(venda, "termoContrato")}
                >
                  Contrato Loja
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => await gerarContratoFirebase(venda, "vendaRepasse")}
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
                onChange={(e) => setAntigoDono({ ...antigoDono, nome: e.target.value })}
              />
            </div>

            <div>
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={antigoDono.cpf}
                onChange={(e) => setAntigoDono({ ...antigoDono, cpf: e.target.value })}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Label>Mensagem</Label>
            <textarea
              value={detalhesPagamento}
              onChange={(e) => setDetalhesPagamento(e.target.value)}
              className="w-full min-h-[120px] border rounded-md p-2 text-sm"
            />

            <Button
              onClick={async () => {
                if (!vendaSelecionada) return;

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
                  },
                  "termoEntrega"
                );

                setModalEntregaOpen(false);
              }}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              Confirmar e Emitir Documento
            </Button>
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
