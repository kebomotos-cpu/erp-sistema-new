"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/config"
import { toast } from "sonner"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

interface Cliente {
  id: string
  nome: string
  cpf: string
  cidade: string
  estado: string
}

interface Moto {
  id: string
  modelo: string
  marca: string
  cor: string
  ano: string
  chassi: string
  placa: string
  renavam: string
  km: string
  cadastradoPor: string
  valorVenda: number
  foto?: string
  adicionais?: Record<string, string | number>
  vendida?: boolean
}


export default function EstoquePage() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cadastrarModalOpen, setCadastrarModalOpen] = useState(false)
  const [verMaisModalOpen, setVerMaisModalOpen] = useState(false)
  const [venderModalOpen, setVenderModalOpen] = useState(false)
  const [motoSelecionada, setMotoSelecionada] = useState<Moto | null>(null)

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
})

const [venda, setVenda] = useState({
  clienteId: "",
  clienteNome: "",
  cpf: "",
  dataVenda: new Date().toISOString().split("T")[0],
  formaPagamento: "",
  entrada: "",
  observacao: "",
  vendedorResponsavel: "",
})


  // 🔥 Carrega motos e clientes
  useEffect(() => {
    const fetchMotos = async () => {
      const querySnapshot = await getDocs(collection(db, "motos"))
      const motosList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Moto[]
      setMotos(motosList)
    }

    const fetchClientes = async () => {
      const querySnapshot = await getDocs(collection(db, "clientes"))
      const clientesList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Cliente[]
      setClientes(clientesList)
    }

    fetchMotos()
    fetchClientes()
  }, [])

  const handleCadastrarMoto = async () => {
    try {
      if (!novaMoto.modelo || !novaMoto.placa || !novaMoto.valorVenda) {
        toast.error("Preencha os campos obrigatórios (modelo, placa e valor).")
        return
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
}


      const docRef = await addDoc(collection(db, "motos"), moto)
      setMotos([...motos, { id: docRef.id, ...moto }])
      setCadastrarModalOpen(false)
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
      })

      toast.success("Moto cadastrada com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar moto:", error)
      toast.error("Erro ao salvar moto.")
    }
  }

  const handleSelecionarCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId)
    if (cliente) {
      setVenda({
        ...venda,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        cpf: cliente.cpf,
      })
    }
  }

  const handleConfirmarVenda = async () => {
    if (!motoSelecionada || !venda.clienteId || !venda.formaPagamento) {
      toast.error("Preencha os dados obrigatórios da venda.")
      return
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
})



      // 2️⃣ Atualizar status da moto para "vendida"
      const motoRef = doc(db, "motos", motoSelecionada.id)
      await updateDoc(motoRef, { vendida: true })

      // 3️⃣ Atualizar localmente
      setMotos((prev) =>
        prev.map((m) =>
          m.id === motoSelecionada.id ? { ...m, vendida: true } : m
        )
      )

      toast.success("Venda registrada com sucesso!", {
        description: `${motoSelecionada.modelo} vendida para ${venda.clienteNome}`,
      })

      setVenderModalOpen(false)
      setVenda({
        clienteId: "",
        clienteNome: "",
        cpf: "",
        dataVenda: new Date().toISOString().split("T")[0],
        formaPagamento: "",
        entrada: "",
        observacao: "",
        vendedorResponsavel: "",
      })
    } catch (error) {
      console.error("Erro ao registrar venda:", error)
      toast.error("Erro ao registrar venda.")
    }
  }

  function NegotiationParams() {
  const [params, setParams] = useState<{ nome: string; valor: string }[]>([])

  const adicionarParametro = () => {
    setParams([...params, { nome: "", valor: "" }])
  }

  const atualizarParametro = (index: number, campo: string, valor: string) => {
    const novos = [...params]
    novos[index] = { ...novos[index], [campo]: valor }
    setParams(novos)
  }

  const removerParametro = (index: number) => {
    const novos = params.filter((_, i) => i !== index)
    setParams(novos)
  }

  return (
    <div className="space-y-3 mt-3">
      {params.map((param, index) => (
        <div key={index} className="flex gap-2 items-center">
          <Input
            placeholder="Nome (ex: Parcela 1)"
            value={param.nome}
            onChange={(e) =>
              atualizarParametro(index, "nome", e.target.value)
            }
            className="flex-1"
          />
          <Input
            placeholder="Valor (R$)"
            value={param.valor}
            onChange={(e) =>
              atualizarParametro(index, "valor", e.target.value)
            }
            className="w-32"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => removerParametro(index)}
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
  )
}


  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[#dc2626]">Estoque</h1>
        <Button onClick={() => setCadastrarModalOpen(true)} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          Cadastrar Nova Moto
        </Button>
      </div>

      {/* Lista de motos */}
      <div className="space-y-4">
        {motos.length === 0 && <p className="text-muted-foreground">Nenhuma moto cadastrada.</p>}
        {motos.map((moto) => (
          <Card
            key={moto.id}
            className={`p-6 transition-all duration-300 ${
              moto.vendida ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="flex gap-6">
              <div className="w-48 h-32 bg-muted rounded-md overflow-hidden">
                {moto.foto ? (
                  <img src={moto.foto} alt={moto.modelo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Foto</div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">{moto.modelo}</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Ano:</span> {moto.ano}</p>
                  <p><span className="font-medium">Chassi:</span> {moto.chassi}</p>
                  <p><span className="font-medium">Placa:</span> {moto.placa}</p>
                  <p><span className="font-medium">Cadastrado Por:</span> {moto.cadastradoPor}</p>
                </div>

                {!moto.vendida && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setMotoSelecionada(moto)
                        setVerMaisModalOpen(true)
                      }}
                      variant="outline"
                      className="text-[#dc2626]"
                    >
                      Ver mais
                    </Button>

                    <Button
                      onClick={() => {
                        setMotoSelecionada(moto)
                        setVenderModalOpen(true)
                      }}
                      className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                    >
                      Vender Moto →
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">Valor de Venda</p>
                  <p className="text-lg font-bold">
                    R$ {moto.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAIS (mantidos exatamente iguais, funcionando) */}
      {/* Cadastrar Moto */}
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
          onChange={(e) => setNovaMoto({ ...novaMoto, marca: e.target.value })}
        />
      </div>

      <div>
        <Label>Modelo</Label>
        <Input
          placeholder="Ex: CG 160 Titan"
          value={novaMoto.modelo}
          onChange={(e) => setNovaMoto({ ...novaMoto, modelo: e.target.value })}
        />
      </div>

      <div>
        <Label>Ano/Modelo</Label>
        <Input
          placeholder="Ex: 2023/2024"
          value={novaMoto.ano}
          onChange={(e) => setNovaMoto({ ...novaMoto, ano: e.target.value })}
        />
      </div>

      <div>
        <Label>Cor</Label>
        <Input
          placeholder="Ex: Vermelha"
          value={novaMoto.cor}
          onChange={(e) => setNovaMoto({ ...novaMoto, cor: e.target.value })}
        />
      </div>

      <div>
        <Label>Placa</Label>
        <Input
          placeholder="Ex: ABC1D23"
          value={novaMoto.placa}
          onChange={(e) =>
            setNovaMoto({ ...novaMoto, placa: e.target.value.toUpperCase() })
          }
        />
      </div>

      <div>
        <Label>RENAVAM</Label>
        <Input
          placeholder="Ex: 01327346068"
          value={novaMoto.renavam}
          onChange={(e) => setNovaMoto({ ...novaMoto, renavam: e.target.value })}
        />
      </div>

      <div>
        <Label>CHASSI</Label>
        <Input
          placeholder="Ex: 9C2KC2210PR021555"
          value={novaMoto.chassi}
          onChange={(e) => setNovaMoto({ ...novaMoto, chassi: e.target.value })}
        />
      </div>

      <div>
        <Label>KM</Label>
        <Input
          placeholder="Ex: 2300"
          value={novaMoto.km}
          onChange={(e) => setNovaMoto({ ...novaMoto, km: e.target.value })}
        />
      </div>

      <div>
        <Label>Valor de Venda (R$)</Label>
        <Input
          type="number"
          placeholder="Ex: 19000"
          value={novaMoto.valorVenda}
          onChange={(e) => setNovaMoto({ ...novaMoto, valorVenda: e.target.value })}
        />
      </div>

      <div>
        <Label>URL da Foto (opcional)</Label>
        <Input
          placeholder="https://exemplo.com/foto.jpg"
          value={novaMoto.foto}
          onChange={(e) => setNovaMoto({ ...novaMoto, foto: e.target.value })}
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


      {/* Ver mais */}
      <Dialog open={verMaisModalOpen} onOpenChange={setVerMaisModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{motoSelecionada?.modelo}</DialogTitle>
          </DialogHeader>
          {motoSelecionada && (
            <div className="space-y-2 text-sm">
              <p><strong>Ano:</strong> {motoSelecionada.ano}</p>
              <p><strong>Chassi:</strong> {motoSelecionada.chassi}</p>
              <p><strong>Placa:</strong> {motoSelecionada.placa}</p>
              <p><strong>Cadastrado Por:</strong> {motoSelecionada.cadastradoPor}</p>
              <p><strong>Valor de Venda:</strong> R$ {motoSelecionada.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
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
            onChange={(e) => setVenda({ ...venda, entrada: e.target.value })}
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
          onValueChange={(v) => setVenda({ ...venda, vendedorResponsavel: v })}
          value={venda.vendedorResponsavel}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KEBO MOTOS LTDA">Kebo Motos LTDA</SelectItem>
            <SelectItem value="IRAN DE SOUZA">Iran de Souza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parâmetros de negociação dinâmicos */}
      <div className="border rounded-md p-4">
        <Label className="font-semibold text-[#dc2626]">
          Parâmetros de Negociação
        </Label>

        <NegotiationParams />
      </div>

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
  )
}
