"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Moto {
  id: string
  modelo: string
  ano: string
  chassi: string
  placa: string
  cadastradoPor: string
  valorVenda: number
  foto?: string
}

export default function EstoquePage() {
  const [motos, setMotos] = useState<Moto[]>([
    {
      id: "1",
      modelo: "Biz 125 EX Modo Esporte Teste de Moto",
      ano: "2014/15",
      chassi: "515188419165",
      placa: "ABC-1234",
      cadastradoPor: "Igor de Souza",
      valorVenda: 27534.25,
      foto: "/moto-biz-125.jpg",
    },
    {
      id: "2",
      modelo: "Biz 125 EX Modo Esporte Teste de Moto",
      ano: "2014/15",
      chassi: "515188419165",
      placa: "DEF-5678",
      cadastradoPor: "Igor de Souza",
      valorVenda: 27534.25,
      foto: "/moto-biz-125.jpg",
    },
    {
      id: "3",
      modelo: "Biz 125 EX Modo Esporte Teste de Moto",
      ano: "2014/15",
      chassi: "515188419165",
      placa: "GHI-9012",
      cadastradoPor: "Igor de Souza",
      valorVenda: 27534.25,
      foto: "/moto-biz-125.jpg",
    },
  ])

  const [cadastrarModalOpen, setCadastrarModalOpen] = useState(false)
  const [venderModalOpen, setVenderModalOpen] = useState(false)
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false)
  const [verMaisModalOpen, setVerMaisModalOpen] = useState(false)
  const [motoSelecionada, setMotoSelecionada] = useState<Moto | null>(null)

  const [novaMoto, setNovaMoto] = useState({
    modelo: "",
    ano: "",
    chassi: "",
    placa: "",
    cadastradoPor: "",
    valorVenda: "27534.25",
    foto: "",
  })

  const [vendaForm, setVendaForm] = useState({
    cliente: "",
    dataVenda: new Date().toISOString().split("T")[0],
    formaPagamento: "",
    entrada: "5000",
    valorTotal: "27534.25",
  })

 

  const handleVerMais = (moto: Moto) => {
    setMotoSelecionada(moto)
    setVerMaisModalOpen(true)
  }

  const handleVenderMoto = (moto: Moto) => {
    setMotoSelecionada(moto)
    setVendaForm({
      ...vendaForm,
      valorTotal: moto.valorVenda.toString(),
    })
    setVenderModalOpen(true)
  }

  const handleCadastrarMoto = () => {
    const moto: Moto = {
      id: Date.now().toString(),
      modelo: novaMoto.modelo,
      ano: novaMoto.ano,
      chassi: novaMoto.chassi,
      placa: novaMoto.placa,
      cadastradoPor: novaMoto.cadastradoPor,
      valorVenda: Number.parseFloat(novaMoto.valorVenda) || 0,
      foto: novaMoto.foto || "/moto.jpg",
    }
    setMotos([...motos, moto])
    setCadastrarModalOpen(false)
    setNovaMoto({
      modelo: "",
      ano: "",
      chassi: "",
      placa: "",
      cadastradoPor: "",
      valorVenda: "27534.25",
      foto: "",
    })
  }

  const handleConfirmarVenda = () => {
    setVenderModalOpen(false)
    // Aqui você pode adicionar lógica para salvar a venda
  }

  const calcularParcelas = () => {
    const valorTotal = Number.parseFloat(vendaForm.valorTotal) || 0
    const entrada = Number.parseFloat(vendaForm.entrada) || 0
    const valorRestante = valorTotal - entrada
    const numeroParcelas = 27
    const valorParcela = valorRestante / numeroParcelas
    return { numeroParcelas, valorParcela, valorRestante }
  }

  const { numeroParcelas, valorParcela, valorRestante } = calcularParcelas()
  const despesasCadastradas = 22534.25

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-[#dc2626]">Estoque</h1>
        <Button onClick={() => setCadastrarModalOpen(true)} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          Cadastrar Nova Moto
        </Button>
      </div>

      <div className="space-y-4">
        {motos.map((moto) => (
          <Card key={moto.id} className="p-6">
            <div className="flex gap-6">
              <div className="w-48 h-32 bg-muted rounded-md overflow-hidden">
                {moto.foto ? (
                  <img src={moto.foto || "/placeholder.svg"} alt={moto.modelo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Foto</div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">{moto.modelo}</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Modelo da Moto:</span> {moto.modelo}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Ano:</span> {moto.ano}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Chassi:</span> {moto.chassi}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Cadastrado Por:</span> {moto.cadastradoPor}
                  </p>
                </div>
                <Button onClick={() => handleVerMais(moto)} variant="link" className="p-0 h-auto text-[#dc2626]">
                  Ver mais →
                </Button>
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">Dados do Cadastro</p>
                  <p className="text-sm text-muted-foreground">Placa da Moto</p>
                  <p className="text-sm font-medium">{moto.placa}</p>
                  <p className="text-sm text-muted-foreground">Valor de Venda</p>
                  <p className="text-sm font-medium">
                    R$ {moto.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button onClick={() => handleVenderMoto(moto)} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
                  Vender Moto →
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={verMaisModalOpen} onOpenChange={setVerMaisModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Detalhes da Moto</DialogTitle>
          </DialogHeader>
          {motoSelecionada && (
            <div className="space-y-6">
              <div className="w-full h-64 bg-muted rounded-lg overflow-hidden">
                {motoSelecionada.foto ? (
                  <img
                    src={motoSelecionada.foto || "/placeholder.svg"}
                    alt={motoSelecionada.modelo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Sem foto disponível
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo da Moto</p>
                    <p className="text-lg font-semibold">{motoSelecionada.modelo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ano</p>
                    <p className="text-lg font-semibold">{motoSelecionada.ano}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chassi</p>
                    <p className="text-lg font-semibold">{motoSelecionada.chassi}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Placa da Moto</p>
                    <p className="text-lg font-semibold">{motoSelecionada.placa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cadastrado Por</p>
                    <p className="text-lg font-semibold">{motoSelecionada.cadastradoPor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor de Venda</p>
                    <p className="text-2xl font-bold text-[#dc2626]">
                      R$ {motoSelecionada.valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setVerMaisModalOpen(false)
                    handleVenderMoto(motoSelecionada)
                  }}
                  className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                >
                  Vender Moto →
                </Button>
                <Button
                  onClick={() => {
                    setDocumentosModalOpen(true)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Emitir Documentos
                </Button>
                <Button onClick={() => setVerMaisModalOpen(false)} variant="outline" className="flex-1">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cadastrarModalOpen} onOpenChange={setCadastrarModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cadastrar Nova Moto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="foto">Link da Imagem</Label>
              <Input
                id="foto"
                value={novaMoto.foto}
                onChange={(e) => setNovaMoto({ ...novaMoto, foto: e.target.value })}
                placeholder="https://exemplo.com/imagem-moto.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo da Moto</Label>
                <Input
                  id="modelo"
                  value={novaMoto.modelo}
                  onChange={(e) => setNovaMoto({ ...novaMoto, modelo: e.target.value })}
                  placeholder="Ex: Biz 125 EX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  value={novaMoto.ano}
                  onChange={(e) => setNovaMoto({ ...novaMoto, ano: e.target.value })}
                  placeholder="Ex: 2014/15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chassi">Chassi</Label>
                <Input
                  id="chassi"
                  value={novaMoto.chassi}
                  onChange={(e) => setNovaMoto({ ...novaMoto, chassi: e.target.value })}
                  placeholder="Ex: 515188419165"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  value={novaMoto.placa}
                  onChange={(e) => setNovaMoto({ ...novaMoto, placa: e.target.value })}
                  placeholder="Ex: ABC-1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cadastradoPor">Cadastrado Por</Label>
                <Input
                  id="cadastradoPor"
                  value={novaMoto.cadastradoPor}
                  onChange={(e) => setNovaMoto({ ...novaMoto, cadastradoPor: e.target.value })}
                  placeholder="Ex: Igor de Souza"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorVenda">Valor de Venda</Label>
                <Input
                  id="valorVenda"
                  type="text"
                  value={novaMoto.valorVenda}
                  onChange={(e) => setNovaMoto({ ...novaMoto, valorVenda: e.target.value })}
                  placeholder="27534.25"
                />
              </div>
            </div>

            <Button onClick={handleCadastrarMoto} className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              Cadastrar Moto →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={venderModalOpen} onOpenChange={setVenderModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cadastro de Venda de Moto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Selecione o Cliente</Label>
              <Select
                value={vendaForm.cliente}
                onValueChange={(value) => setVendaForm({ ...vendaForm, cliente: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nome e dados do cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente1">João Silva</SelectItem>
                  <SelectItem value="cliente2">Maria Santos</SelectItem>
                  <SelectItem value="cliente3">Pedro Oliveira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataVenda">Data da Venda</Label>
                <Input
                  id="dataVenda"
                  type="date"
                  value={vendaForm.dataVenda}
                  onChange={(e) => setVendaForm({ ...vendaForm, dataVenda: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modeloVenda">Selecione o Modelo da Moto</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modelo1">{motoSelecionada?.modelo}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorTotal">Valor Total</Label>
              <Input
                id="valorTotal"
                type="text"
                value={vendaForm.valorTotal}
                onChange={(e) => setVendaForm({ ...vendaForm, valorTotal: e.target.value })}
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formaPagamento">Formas de Pagamento</Label>
              <Select
                value={vendaForm.formaPagamento}
                onValueChange={(value) => setVendaForm({ ...vendaForm, formaPagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione →" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entrada">Entrada</Label>
              <Input
                id="entrada"
                type="text"
                value={vendaForm.entrada}
                onChange={(e) => setVendaForm({ ...vendaForm, entrada: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Valor a Pagar</p>
                <p className="text-xl font-bold">
                  R$ {valorRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forma Restante</p>
                <p className="text-xl font-bold">
                  {numeroParcelas}x de {valorParcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no Boleto
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total - Despesas Cadastradas na Moto →</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {despesasCadastradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button onClick={handleConfirmarVenda} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
                Cadastrar Venda de Moto →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
