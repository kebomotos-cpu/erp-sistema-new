"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Plus, UserPlus, Trash2 } from "lucide-react"
import { db } from "@/firebase/config"
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore"
import { toast } from "sonner"

interface Cliente {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  endereco: string
  cidade: string
  estado: string
  avatar: string
  extras?: Record<string, string>
}

const defaultAvatars = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/9439775.jpg-4JVJWOjPksd3DtnBYJXoWHA5lc1DU9.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/375238645_11475210.jpg-lU8bOe6TLt5Rv51hgjg8NT8PsDBmvN.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/375238208_11475222.jpg-poEIzVHAGiIfMFQ7EiF8PUG1u0Zkzz.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dd.jpg-4MCwPC2Bec6Ume26Yo1kao3CnONxDg.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/9334178.jpg-Y74tW6XFO68g7N36SE5MSNDNVKLQ08.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/5295.jpg-fLw0wGGZp8wuTzU5dnyfjZDwAHN98a.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/9720029.jpg-Yf9h2a3kT7rYyCb648iLIeHThq5wEy.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/27470341_7294795.jpg-XE0zf7R8tk4rfA1vm4fAHeZ1QoVEOo.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/799.jpg-0tEi4Xvg5YsFoGoQfQc698q4Dygl1S.jpeg",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/9334228.jpg-eOsHCkvVrVAwcPHKYSs5sQwVKsqWpC.jpeg",
]

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [novoCliente, setNovoCliente] = useState<Omit<Cliente, "id">>({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    avatar: defaultAvatars[0],
    extras: {},
  })
  const [extras, setExtras] = useState<{ key: string; value: string }[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [avatarSelecionado, setAvatarSelecionado] = useState(defaultAvatars[0])
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string; nome: string }>({
    open: false,
    id: "",
    nome: "",
  })

  useEffect(() => {
    const fetchClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"))
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Cliente[]
      setClientes(list)
    }
    fetchClientes()
  }, [])

  const handleCadastrarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.cpf) {
      toast.error("Preencha pelo menos o nome e CPF do cliente.")
      return
    }

    try {
      const cliente = {
        ...novoCliente,
        avatar: avatarSelecionado,
        extras: extras.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
      }

      const docRef = await addDoc(collection(db, "clientes"), cliente)
      setClientes([...clientes, { id: docRef.id, ...cliente }])
      setModalOpen(false)

      setNovoCliente({
        nome: "",
        cpf: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        avatar: defaultAvatars[0],
        extras: {},
      })
      setExtras([])

      toast.success("Cliente cadastrado com sucesso!", {
        description: `Cliente ${cliente.nome} adicionado ao sistema.`,
      })
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error)
      toast.error("Erro ao cadastrar cliente.")
    }
  }

  const handleRemoverCliente = async () => {
    try {
      await deleteDoc(doc(db, "clientes", confirmDialog.id))
      setClientes((prev) => prev.filter((c) => c.id !== confirmDialog.id))
      setConfirmDialog({ open: false, id: "", nome: "" })
      toast.success("Cliente removido com sucesso!", {
        description: `Cliente ${confirmDialog.nome} foi excluído.`,
      })
    } catch {
      toast.error("Erro ao remover cliente.")
    }
  }

  const adicionarCampoExtra = () => setExtras([...extras, { key: "", value: "" }])

  const atualizarExtra = (index: number, field: "key" | "value", value: string) => {
    const novos = [...extras]
    novos[index][field] = value
    setExtras(novos)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#dc2626]">Cadastro de Clientes</h1>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {clientes.length === 0 && (
        <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientes.map((cliente) => (
          <Card key={cliente.id} className="p-6 hover:shadow-lg transition-shadow relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setConfirmDialog({ open: true, id: cliente.id, nome: cliente.nome })
              }
              className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border">
                <AvatarImage src={cliente.avatar} alt={cliente.nome} />
                <AvatarFallback>{cliente.nome.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  {cliente.cidade} - {cliente.estado}
                </p>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              <p><strong>CPF:</strong> {cliente.cpf}</p>
              <p><strong>Telefone:</strong> {cliente.telefone}</p>
              <p><strong>Email:</strong> {cliente.email}</p>
              <p><strong>Endereço:</strong> {cliente.endereco}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL CADASTRAR CLIENTE */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* AVATARES */}
            <div>
              <Label className="mb-2 block">Selecione o Avatar</Label>
              <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {defaultAvatars.map((avatar, i) => (
                  <div
                    key={i}
                    className={`p-1 rounded-lg border cursor-pointer flex justify-center ${
                      avatarSelecionado === avatar ? "border-[#dc2626]" : "border-muted"
                    }`}
                    onClick={() => setAvatarSelecionado(avatar)}
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={avatar} alt={`Avatar ${i + 1}`} />
                      <AvatarFallback>A{i + 1}</AvatarFallback>
                    </Avatar>
                  </div>
                ))}
              </div>
            </div>

            {/* CAMPOS BÁSICOS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={novoCliente.cpf}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={novoCliente.telefone}
                  onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                  placeholder="(47) 99999-9999"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input
                  value={novoCliente.cidade}
                  onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
                  placeholder="Ex: Rio do Sul"
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={novoCliente.estado}
                  onChange={(e) => setNovoCliente({ ...novoCliente, estado: e.target.value })}
                  placeholder="Ex: SC"
                />
              </div>
            </div>

            <div>
              <Label>Endereço Completo</Label>
              <Input
                value={novoCliente.endereco}
                onChange={(e) => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
                placeholder="Rua das Flores, 123"
              />
            </div>

            {/* CAMPOS EXTRAS */}
            <div className="space-y-3">
              <Label>Campos Adicionais</Label>
              {extras.map((extra, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome do campo"
                    value={extra.key}
                    onChange={(e) => atualizarExtra(index, "key", e.target.value)}
                  />
                  <Input
                    placeholder="Valor"
                    value={extra.value}
                    onChange={(e) => atualizarExtra(index, "value", e.target.value)}
                  />
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" onClick={adicionarCampoExtra}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Campo
              </Button>
            </div>

            <Button onClick={handleCadastrarCliente} className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              Salvar Cliente →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover cliente {confirmDialog.nome}?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, id: "", nome: "" })}>
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleRemoverCliente}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
