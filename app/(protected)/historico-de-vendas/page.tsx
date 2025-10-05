"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "sonner";
import { gerarContratoFirebase } from "@/app/contract/generate/firebaseContracts";

interface Venda {
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
  dataVenda: string;
  valorVenda: number;
  observacao?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  vendedorResponsavel?: string;
}

export default function HistoricoVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const vendasPaginadas = vendas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "storehistoryc"));
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Venda[];
        setVendas(list);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar vendas.");
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-[#dc2626]">
        Histórico de Vendas
      </h1>

      <div className="grid gap-4">
        {vendasPaginadas.length === 0 && (
          <p className="text-muted-foreground">Nenhuma venda registrada.</p>
        )}

        {vendasPaginadas.map((venda) => (
          <Card key={venda.id} className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{venda.clienteNome}</h3>
                <p className="text-sm text-muted-foreground">
                  {venda.modelo} — {venda.placa}
                </p>
                <p className="text-sm text-muted-foreground">
                  {venda.dataVenda} — R${" "}
                  {venda.valorVenda.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

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
                  onClick={async () =>
                    await gerarContratoFirebase(venda, "termoEntrega")
                  }
                >
                  Termo de Entrega
                </Button>

                <Button
                  variant="outline"
                  onClick={async () =>
                    await gerarContratoFirebase(venda, "reservaDominio")
                  }
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

      {/* Paginação simples */}
      <div className="flex justify-center mt-6">
        {Array.from({ length: Math.ceil(vendas.length / itemsPerPage) }).map(
          (_, index) => (
            <Button
              key={index}
              variant={index + 1 === currentPage ? "default" : "outline"}
              className="mx-1"
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
