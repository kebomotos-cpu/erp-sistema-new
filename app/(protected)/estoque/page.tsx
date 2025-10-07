"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  cidade: string;
  estado: string;
}

interface Moto {
  id: string;
  modelo: string;
  marca: string;
  cor: string;
  ano: string;
  chassi: string;
  placa: string;
  renavam: string;
  km: string;
  cadastradoPor: string;
  valorVenda: number;
  foto?: string;
  adicionais?: Record<string, string | number>;
  vendida?: boolean;
}

export default function EstoquePage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [cadastrarModalOpen, setCadastrarModalOpen] = useState(false);
  const [verMaisModalOpen, setVerMaisModalOpen] = useState(false);
  const [venderModalOpen, setVenderModalOpen] = useState(false);
  const [motoSelecionada, setMotoSelecionada] = useState<Moto | null>(null);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [novaMoto, setNovaMoto] = useState({
    modelo: "",
    marca: "",
    cor: "",
    ano: "",
    chassi: "",
    placa: "",
    renavam: "",
    km: "",
    cadastradoPor: "",
    valorVenda: "",
    foto: "",
  });
  const [venda, setVenda] = useState({
    clienteId: "",
    clienteNome: "",
    cpf: "",
    dataVenda: new Date().toISOString().split("T")[0],
    formaPagamento: "",
    entrada: "",
    observacao: "",
    vendedorResponsavel: "",
  });

  useEffect(() => {
   const fetchMotos = async () => {
  const q = query(collection(db, "motos"), orderBy("chassi", "desc"))
  const snapshot = await getDocs(q)
  const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Moto[]

  // 🔥 Motos disponíveis primeiro, depois vendidas
  list.sort((a, b) => {
    if (a.vendida === b.vendida) return 0
    return a.vendida ? 1 : -1
  })

  setMotos(list)
}

    const fetchClientes = async () => {
      const snap = await getDocs(collection(db, "clientes"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Cliente[];
      setClientes(list);
    };

    fetchMotos();
    fetchClientes();
  }, []);

  const motosFiltradas = motos.filter((m) => {
    const termo = search.toLowerCase();
    return (
      m.modelo.toLowerCase().includes(termo) ||
      m.placa.toLowerCase().includes(termo)
    );
  });

const [paginaAtual, setPaginaAtual] = useState(1)
const motosPorPagina = 4
const totalPaginas = Math.ceil(motosFiltradas.length / motosPorPagina)

const motosExibidas = motosFiltradas.slice(
  (paginaAtual - 1) * motosPorPagina,
  paginaAtual * motosPorPagina
)


  const handleCadastrarMoto = async () => {
    try {
      if (!novaMoto.modelo || !novaMoto.placa || !novaMoto.valorVenda) {
        toast.error("Preencha os campos obrigatórios (modelo, placa e valor).");
        return;
      }

      const moto = {
        modelo: novaMoto.modelo,
        marca: novaMoto.marca,
        cor: novaMoto.cor,
        ano: novaMoto.ano,
        chassi: novaMoto.chassi,
        placa: novaMoto.placa.toUpperCase(),
        renavam: novaMoto.renavam,
        km: novaMoto.km,
        cadastradoPor: novaMoto.cadastradoPor || "Admin",
        valorVenda: Number(novaMoto.valorVenda),
        foto: novaMoto.foto || "/moto.jpg",
        adicionais: {},
        vendida: false,
      };

      const docRef = await addDoc(collection(db, "motos"), moto);
      setMotos((prev) => [{ id: docRef.id, ...moto }, ...prev]); // adiciona no topo
      setCadastrarModalOpen(false);
      setNovaMoto({
        modelo: "",
        marca: "",
        cor: "",
        ano: "",
        chassi: "",
        placa: "",
        renavam: "",
        km: "",
        cadastradoPor: "",
        valorVenda: "",
        foto: "",
      });
      toast.success("Moto cadastrada com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar moto:", error);
      toast.error("Erro ao salvar moto.");
    }
  };
  const handleSalvarEdicao = async () => {
    if (!motoSelecionada) return;
    try {
      const motoRef = doc(db, "motos", motoSelecionada.id);
      await updateDoc(motoRef, {
        modelo: motoSelecionada.modelo,
        marca: motoSelecionada.marca,
        cor: motoSelecionada.cor,
        ano: motoSelecionada.ano,
        valorVenda: motoSelecionada.valorVenda,
        foto: motoSelecionada.foto,
      });
      setMotos((prev) =>
        prev.map((m) =>
          m.id === motoSelecionada.id ? { ...motoSelecionada } : m
        )
      );
      toast.success("Dados da moto atualizados com sucesso!");
      setEditarModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar moto:", error);
      toast.error("Erro ao atualizar moto.");
    }
  };

  const handleSelecionarCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      setVenda({
        ...venda,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        cpf: cliente.cpf,
      });
    }
  };

  const handleConfirmarVenda = async () => {
    if (!motoSelecionada || !venda.clienteId || !venda.formaPagamento) {
      toast.error("Preencha os dados obrigatórios da venda.");
      return;
    }

    try {
      await addDoc(collection(db, "storehistoryc"), {
        ...venda,
        valorVenda: motoSelecionada.valorVenda,
        modelo: motoSelecionada.modelo,
        marca: motoSelecionada.marca,
        cor: motoSelecionada.cor,
        ano: motoSelecionada.ano,
        placa: motoSelecionada.placa,
        renavam: motoSelecionada.renavam,
        chassi: motoSelecionada.chassi,
        km: motoSelecionada.km,
        dataRegistro: new Date().toISOString(),
      });

      await updateDoc(doc(db, "motos", motoSelecionada.id), { vendida: true });

      setMotos((prev) =>
        prev.map((m) =>
          m.id === motoSelecionada.id ? { ...m, vendida: true } : m
        )
      );

      toast.success("Venda registrada com sucesso!", {
        description: `${motoSelecionada.modelo} vendida para ${venda.clienteNome}`,
      });

      setVenderModalOpen(false);
      setVenda({
        clienteId: "",
        clienteNome: "",
        cpf: "",
        dataVenda: new Date().toISOString().split("T")[0],
        formaPagamento: "",
        entrada: "",
        observacao: "",
        vendedorResponsavel: "",
      });
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      toast.error("Erro ao registrar venda.");
    }
  };

  function NegotiationParams() {
    const [params, setParams] = useState<{ nome: string; valor: string }[]>([]);

    const adicionarParametro = () =>
      setParams([...params, { nome: "", valor: "" }]);
    const atualizarParametro = (i: number, campo: string, valor: string) => {
      const novos = [...params];
      novos[i] = { ...novos[i], [campo]: valor };
      setParams(novos);
    };
    const removerParametro = (i: number) =>
      setParams(params.filter((_, idx) => idx !== i));

    return (
      <div className="space-y-3 mt-3">
        {params.map((p, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder="Nome (ex: Parcela 1)"
              value={p.nome}
              onChange={(e) => atualizarParametro(i, "nome", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Valor (R$)"
              value={p.valor}
              onChange={(e) => atualizarParametro(i, "valor", e.target.value)}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => removerParametro(i)}
              className="text-[#dc2626]"
            >
              X
            </Button>
          </div>
        ))}
        <Button
          onClick={adicionarParametro}
          variant="outline"
          className="text-[#dc2626] mt-2"
        >
          + Adicionar Parâmetro
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com busca */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[#dc2626]">
          Estoque
        </h1>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por modelo ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button
            onClick={() => setCadastrarModalOpen(true)}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            + Nova Moto
          </Button>
        </div>
      </div>

      {/* Lista de motos */}
      <div className="space-y-4">
        {motosFiltradas.length === 0 && (
          <p className="text-muted-foreground">Nenhuma moto encontrada.</p>
        )}
        {motosExibidas.map((moto) => (
          <Card
            key={moto.id}
            className={`p-6 transition-all duration-300 ${
              moto.vendida ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="flex gap-6">
              <div className="w-48 h-32 bg-muted rounded-md overflow-hidden">
                {moto.foto ? (
                  <img
                    src={moto.foto}
                    alt={moto.modelo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Foto
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">{moto.modelo}</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Ano:</strong> {moto.ano}
                  </p>
                  <p>
                    <strong>Chassi:</strong> {moto.chassi}
                  </p>
                  <p>
                    <strong>Placa:</strong> {moto.placa}
                  </p>
                  <p>
                    <strong>Cadastrado Por:</strong> {moto.cadastradoPor}
                  </p>
                </div>

                {!moto.vendida && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="text-[#dc2626]"
                      onClick={() => {
                        setMotoSelecionada(moto);
                        setEditarModalOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="text-[#dc2626]"
                      onClick={() => {
                        setMotoSelecionada(moto);
                        setVerMaisModalOpen(true);
                      }}
                    >
                      Ver mais
                    </Button>
                    <Button
                      className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                      onClick={() => {
                        setMotoSelecionada(moto);
                        setVenderModalOpen(true);
                      }}
                    >
                      Vender Moto →
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between items-end">
                <p className="text-sm font-medium">Valor de Venda</p>
                <p className="text-lg font-bold">
                  R${" "}
                  {moto.valorVenda.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
{totalPaginas > 1 && (
  <div className="flex justify-center items-center gap-3 mt-4">
    <Button
      variant="outline"
      disabled={paginaAtual === 1}
      onClick={() => setPaginaAtual((p) => p - 1)}
      className="text-[#dc2626]"
    >
      ← Anterior
    </Button>

    <p className="text-sm text-muted-foreground">
      Página {paginaAtual} de {totalPaginas}
    </p>

    <Button
      variant="outline"
      disabled={paginaAtual === totalPaginas}
      onClick={() => setPaginaAtual((p) => p + 1)}
      className="text-[#dc2626]"
    >
      Próxima →
    </Button>
  </div>
)}

      <Dialog open={cadastrarModalOpen} onOpenChange={setCadastrarModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Moto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Marca</Label>
              <Input
                placeholder="Ex: Honda"
                value={novaMoto.marca}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, marca: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Modelo</Label>
              <Input
                placeholder="Ex: CG 160 Titan"
                value={novaMoto.modelo}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, modelo: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Ano/Modelo</Label>
              <Input
                placeholder="Ex: 2023/2024"
                value={novaMoto.ano}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, ano: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Cor</Label>
              <Input
                placeholder="Ex: Vermelha"
                value={novaMoto.cor}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, cor: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Placa</Label>
              <Input
                placeholder="Ex: ABC1D23"
                value={novaMoto.placa}
                onChange={(e) =>
                  setNovaMoto({
                    ...novaMoto,
                    placa: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div>
              <Label>RENAVAM</Label>
              <Input
                placeholder="Ex: 01327346068"
                value={novaMoto.renavam}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, renavam: e.target.value })
                }
              />
            </div>

            <div>
              <Label>CHASSI</Label>
              <Input
                placeholder="Ex: 9C2KC2210PR021555"
                value={novaMoto.chassi}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, chassi: e.target.value })
                }
              />
            </div>

            <div>
              <Label>KM</Label>
              <Input
                placeholder="Ex: 2300"
                value={novaMoto.km}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, km: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Valor de Venda (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 19000"
                value={novaMoto.valorVenda}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, valorVenda: e.target.value })
                }
              />
            </div>

            <div>
              <Label>URL da Foto (opcional)</Label>
              <Input
                placeholder="https://exemplo.com/foto.jpg"
                value={novaMoto.foto}
                onChange={(e) =>
                  setNovaMoto({ ...novaMoto, foto: e.target.value })
                }
              />
            </div>

            <Button
              onClick={handleCadastrarMoto}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              Salvar Moto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
{/* Modal Editar Moto */}
<Dialog open={editarModalOpen} onOpenChange={setEditarModalOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader><DialogTitle>Editar Moto</DialogTitle></DialogHeader>
    {motoSelecionada && (
      <div className="space-y-3">
        <Label>Modelo</Label>
        <Input
          value={motoSelecionada.modelo}
          onChange={(e) =>
            setMotoSelecionada({ ...motoSelecionada, modelo: e.target.value })
          }
        />

        <Label>Marca</Label>
        <Input
          value={motoSelecionada.marca}
          onChange={(e) =>
            setMotoSelecionada({ ...motoSelecionada, marca: e.target.value })
          }
        />

        <Label>Cor</Label>
        <Input
          value={motoSelecionada.cor}
          onChange={(e) =>
            setMotoSelecionada({ ...motoSelecionada, cor: e.target.value })
          }
        />

        <Label>Valor de Venda</Label>
        <Input
          type="number"
          value={motoSelecionada.valorVenda}
          onChange={(e) =>
            setMotoSelecionada({
              ...motoSelecionada,
              valorVenda: Number(e.target.value),
            })
          }
        />

        <Label>Foto (URL)</Label>
        <Input
          value={motoSelecionada.foto || ""}
          onChange={(e) =>
            setMotoSelecionada({ ...motoSelecionada, foto: e.target.value })
          }
        />

        <Button
          onClick={handleSalvarEdicao}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
        >
          Salvar Alterações
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>

      {/* Ver mais */}
      <Dialog open={verMaisModalOpen} onOpenChange={setVerMaisModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{motoSelecionada?.modelo}</DialogTitle>
          </DialogHeader>
          {motoSelecionada && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Ano:</strong> {motoSelecionada.ano}
              </p>
              <p>
                <strong>Chassi:</strong> {motoSelecionada.chassi}
              </p>
              <p>
                <strong>Placa:</strong> {motoSelecionada.placa}
              </p>
              <p>
                <strong>Cadastrado Por:</strong> {motoSelecionada.cadastradoPor}
              </p>
              <p>
                <strong>Valor de Venda:</strong> R${" "}
                {motoSelecionada.valorVenda.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vender Moto */}
      {/* Vender Moto */}
      <Dialog open={venderModalOpen} onOpenChange={setVenderModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Vender {motoSelecionada?.modelo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selecionar cliente */}
            <div>
              <Label>Cliente</Label>
              <Select onValueChange={handleSelecionarCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome} - {cliente.cidade}/{cliente.estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos principais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CPF</Label>
                <Input value={venda.cpf} readOnly className="bg-muted" />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Input
                  value={venda.formaPagamento}
                  onChange={(e) =>
                    setVenda({ ...venda, formaPagamento: e.target.value })
                  }
                  placeholder="Ex: Pix, Financiamento..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entrada (R$)</Label>
                <Input
                  type="number"
                  value={venda.entrada}
                  onChange={(e) =>
                    setVenda({ ...venda, entrada: e.target.value })
                  }
                  placeholder="Ex: 3000"
                />
              </div>
              <div>
                <Label>Observação</Label>
                <Input
                  value={venda.observacao}
                  onChange={(e) =>
                    setVenda({ ...venda, observacao: e.target.value })
                  }
                  placeholder="Ex: Moto entregue com manual e chave reserva"
                />
              </div>
            </div>

            {/* Vendedor */}
            <div>
              <Label>Vendedor Responsável</Label>
              <Select
                onValueChange={(v) =>
                  setVenda({ ...venda, vendedorResponsavel: v })
                }
                value={venda.vendedorResponsavel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEBO MOTOS LTDA">
                    Kebo Motos LTDA
                  </SelectItem>
                  <SelectItem value="IRAN DE SOUZA">Iran de Souza</SelectItem>
                  <SelectItem value="STEFANY">Stefany</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parâmetros de negociação dinâmicos */}
            {/* <div className="border rounded-md p-4"> */}
              {/* <Label className="font-semibold text-[#dc2626]">
                Parâmetros de Negociação
              </Label> */}

              {/* <NegotiationParams /> */}
            {/* </div> */}

            <Button
              onClick={handleConfirmarVenda}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              Confirmar Venda →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
