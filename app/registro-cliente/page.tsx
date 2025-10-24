"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Trash2, Search } from "lucide-react";
import { db } from "@/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  avatar: string;
  extras?: Record<string, string>;
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
];

const formatEndereco = (e: {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}) =>
  `${e.rua}, ${e.numero} - ${e.bairro}, ${e.cidade} - ${e.estado}, CEP ${e.cep}`;

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Cadastro (2 etapas)
  const [etapaCadastro, setEtapaCadastro] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [avatarSelecionado, setAvatarSelecionado] = useState(defaultAvatars[0]);

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
  });

  const [enderecoCliente, setEnderecoCliente] = useState({
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  // Edição de endereço
  const [editarEnderecoOpen, setEditarEnderecoOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(
    null
  );
  const [novoEndereco, setNovoEndereco] = useState({
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  // Confirmação de exclusão
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    id: "",
    nome: "",
  });

  // Filtro de busca
  const clientesFiltrados = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      Object.values(c).some((v) => String(v).toLowerCase().includes(t))
    );
  }, [clientes, searchTerm]);

  // Buscar clientes (primeira carga)
  useEffect(() => {
    const fetchClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"));
      const list = snapshot.docs.map((d) => {
        const data = d.data() as Omit<Cliente, "id">;
        return { id: d.id, ...data };
      }) as Cliente[];
      setClientes(list);
    };
    fetchClientes();
  }, []);

  // Util: reset do wizard de cadastro
  const resetCadastro = () => {
    setEtapaCadastro(1);
    setAvatarSelecionado(defaultAvatars[0]);
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
    });
    setEnderecoCliente({
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
    });
  };

  // Cadastrar cliente
  const handleCadastrarCliente = async () => {
    if (etapaCadastro === 1) {
      if (!novoCliente.nome || !novoCliente.cpf) {
        toast.error("Preencha pelo menos o nome e CPF do cliente.");
        return;
      }
      setEtapaCadastro(2);
      return;
    }

    try {
      const cliente = {
        ...novoCliente,
        endereco: formatEndereco(enderecoCliente),
        avatar: avatarSelecionado,
      };

      const docRef = await addDoc(collection(db, "clientes"), cliente);
      setClientes((prev) => [...prev, { id: docRef.id, ...cliente }]);

      toast.success("Cliente cadastrado com sucesso!", {
        description: `Cliente ${cliente.nome} adicionado ao sistema.`,
      });

      setModalOpen(false);
      resetCadastro();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao cadastrar cliente.");
    }
  };

  // Abrir modal de edição de endereço
  const handleAbrirEditarEndereco = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    // preenchimento inicial “melhor esforço”
    const partes = cliente.endereco?.split(",") ?? [];
    setNovoEndereco({
      rua: partes[0] || "",
      numero: "",
      bairro: "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      cep: "",
    });
    // pequeno delay evita glitch de render no shadcn
    setTimeout(() => setEditarEnderecoOpen(true), 20);
  };

  // Salvar endereço atualizado
  const handleSalvarEndereco = async () => {
    if (!clienteSelecionado) return;

    try {
      const enderecoCompleto = formatEndereco(novoEndereco);
      const clienteRef = doc(db, "clientes", clienteSelecionado.id);

      await updateDoc(clienteRef, { endereco: enderecoCompleto });

      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteSelecionado.id ? { ...c, endereco: enderecoCompleto } : c
        )
      );

      toast.success("Endereço atualizado com sucesso!");
      setEditarEnderecoOpen(false);
      setClienteSelecionado(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar endereço.");
    }
  };

  // Remover cliente
  const handleRemoverCliente = async () => {
    try {
      await deleteDoc(doc(db, "clientes", confirmDialog.id));
      setClientes((prev) => prev.filter((c) => c.id !== confirmDialog.id));
      setConfirmDialog({ open: false, id: "", nome: "" });
      toast.success("Cliente removido com sucesso!", {
        description: `Cliente ${confirmDialog.nome} foi excluído.`,
      });
    } catch {
      toast.error("Erro ao remover cliente.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-3xl font-bold text-[#dc2626]">Cadastro de Clientes</h1>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome, CPF, telefone, e-mail, cidade…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* LISTA */}
      {clientesFiltrados.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.id} className="p-6 hover:shadow-lg relative">
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

              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-12 text-[#dc2626] hover:bg-[#dc2626] hover:text-white"
                onClick={() => handleAbrirEditarEndereco(cliente)}
              >
                Alterar Endereço
              </Button>

              <div className="flex items-center gap-4 mt-5">
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
      )}

      {/* === MODAL: CADASTRAR NOVO CLIENTE (2 ETAPAS) === */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetCadastro();
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {etapaCadastro === 1 ? "Cadastrar Novo Cliente" : "Endereço do Cliente"}
            </DialogTitle>
          </DialogHeader>

          {etapaCadastro === 1 ? (
            <div className="space-y-4">
              {/* Avatares */}
              <div>
                <Label className="mb-2 block">Selecione o Avatar</Label>
                <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {defaultAvatars.map((avatar, i) => (
                    <div
                      key={i}
                      className={`p-1 rounded-lg border cursor-pointer flex justify-center ${
                        avatarSelecionado === avatar ? "border-[#dc2626]" : "border-muted"
                      }`}
                      onClick={() => {
                        setAvatarSelecionado(avatar);
                        setNovoCliente((n) => ({ ...n, avatar }));
                      }}
                    >
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={avatar} alt={`Avatar ${i + 1}`} />
                        <AvatarFallback>A{i + 1}</AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos básicos */}
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

              <Button
                onClick={handleCadastrarCliente}
                className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              >
                Próximo →
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Endereço */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rua</Label>
                  <Input
                    value={enderecoCliente.rua}
                    onChange={(e) => setEnderecoCliente({ ...enderecoCliente, rua: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={enderecoCliente.numero}
                    onChange={(e) => setEnderecoCliente({ ...enderecoCliente, numero: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={enderecoCliente.bairro}
                    onChange={(e) => setEnderecoCliente({ ...enderecoCliente, bairro: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={enderecoCliente.cidade}
                    onChange={(e) => setEnderecoCliente({ ...enderecoCliente, cidade: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={enderecoCliente.estado}
                    onChange={(e) => setEnderecoCliente({ ...enderecoCliente, estado: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={enderecoCliente.cep}
                    onChange={(e) => setEnderecoCliente({ ...enderecoCliente, cep: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-[#dc2626]"
                  onClick={() => setEtapaCadastro(1)}
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={handleCadastrarCliente}
                  className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                >
                  Salvar Cliente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === MODAL: ALTERAR ENDEREÇO === */}
      <Dialog open={editarEnderecoOpen} onOpenChange={setEditarEnderecoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Alterar Endereço {clienteSelecionado ? `— ${clienteSelecionado.nome}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {["rua", "numero", "bairro", "cidade", "estado", "cep"].map((campo) => (
              <div key={campo}>
                <Label className="capitalize">{campo}</Label>
                <Input
                  value={(novoEndereco as any)[campo]}
                  onChange={(e) =>
                    setNovoEndereco({ ...novoEndereco, [campo]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditarEnderecoOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              onClick={handleSalvarEndereco}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === MODAL: CONFIRMAR EXCLUSÃO === */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover cliente {confirmDialog.nome}?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, id: "", nome: "" })}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRemoverCliente}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
