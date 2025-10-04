'use client';

import React, { useState } from 'react';
import { X, Calendar, Package, DollarSign, User, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { jsPDF } from "jspdf";

interface Sale {
  id: number;
  clientName: string;
  product: string;
  date: string;
  value: number;
  paymentMethod: string;
  installments: number;
  downPayment: number;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  status: string;
}

type DocumentosState = {
  termoGarantia: boolean;
  termoContrato: boolean;
  reservaDominio: boolean;
  instrumentoLiberacao: boolean;
};


export const mockSalesData: Sale[] = [
  {
    id: 1,
    clientName: "Igor de Souza",
    product: "Moto tal de tal",
    date: "2025-03-15",
    value: 25000.00,
    paymentMethod: "Financiamento",
    installments: 48,
    downPayment: 5000.00,
    email: "igor.souza@email.com",
    phone: "(47) 99999-8888",
    cpf: "123.456.789-00",
    address: "Rua das Flores, 123",
    city: "Rio do Sul",
    state: "SC",
    model: "Honda CG 160",
    year: 2024,
    color: "Vermelha",
    plate: "ABC-1234",
    status: "Concluída"
  },
  {
    id: 2,
    clientName: "Maria Silva",
    product: "Moto tal de tal",
    date: "2025-03-10",
    value: 18500.00,
    paymentMethod: "À Vista",
    installments: 1,
    downPayment: 18500.00,
    email: "maria.silva@email.com",
    phone: "(47) 98888-7777",
    cpf: "987.654.321-00",
    address: "Av. Principal, 456",
    city: "Blumenau",
    state: "SC",
    model: "Yamaha Fazer 250",
    year: 2023,
    color: "Azul",
    plate: "XYZ-5678",
    status: "Concluída"
  },
  {
    id: 3,
    clientName: "João Santos",
    product: "Moto tal de tal",
    date: "2025-03-08",
    value: 32000.00,
    paymentMethod: "Financiamento",
    installments: 60,
    downPayment: 8000.00,
    email: "joao.santos@email.com",
    phone: "(47) 97777-6666",
    cpf: "456.789.123-00",
    address: "Rua dos Pinheiros, 789",
    city: "Indaial",
    state: "SC",
    model: "Honda CB 500",
    year: 2024,
    color: "Preta",
    plate: "DEF-9012",
    status: "Concluída"
  },
  {
    id: 4,
    clientName: "Ana Costa",
    product: "Moto tal de tal",
    date: "2025-03-05",
    value: 15000.00,
    paymentMethod: "Cartão de Crédito",
    installments: 12,
    downPayment: 0,
    email: "ana.costa@email.com",
    phone: "(47) 96666-5555",
    cpf: "321.654.987-00",
    address: "Rua Central, 321",
    city: "Timbó",
    state: "SC",
    model: "Suzuki Burgman 125",
    year: 2023,
    color: "Branca",
    plate: "GHI-3456",
    status: "Concluída"
  },
  {
    id: 5,
    clientName: "Carlos Oliveira",
    product: "Moto tal de tal",
    date: "2025-03-01",
    value: 28000.00,
    paymentMethod: "Financiamento",
    installments: 36,
    downPayment: 7000.00,
    email: "carlos.oliveira@email.com",
    phone: "(47) 95555-4444",
    cpf: "159.753.486-00",
    address: "Av. das Palmeiras, 654",
    city: "Rio do Sul",
    state: "SC",
    model: "Kawasaki Ninja 400",
    year: 2024,
    color: "Verde",
    plate: "JKL-7890",
    status: "Concluída"
  },
  {
    id: 6,
    clientName: "Paula Martins",
    product: "Moto tal de tal",
    date: "2025-02-28",
    value: 22000.00,
    paymentMethod: "À Vista",
    installments: 1,
    downPayment: 22000.00,
    email: "paula.martins@email.com",
    phone: "(47) 94444-3333",
    cpf: "753.159.486-00",
    address: "Rua do Comércio, 987",
    city: "Ibirama",
    state: "SC",
    model: "Yamaha MT-03",
    year: 2023,
    color: "Cinza",
    plate: "MNO-1234",
    status: "Concluída"
  },
  {
    id: 7,
    clientName: "Pedro Lima",
    product: "Moto tal de tal",
    date: "2025-02-25",
    value: 19500.00,
    paymentMethod: "Financiamento",
    installments: 24,
    downPayment: 4000.00,
    email: "pedro.lima@email.com",
    phone: "(47) 93333-2222",
    cpf: "852.963.741-00",
    address: "Rua Nova, 147",
    city: "Rio do Sul",
    state: "SC",
    model: "Honda Biz 125",
    year: 2024,
    color: "Branca",
    plate: "PQR-4567",
    status: "Concluída"
  },
  {
    id: 8,
    clientName: "Juliana Ferreira",
    product: "Moto tal de tal",
    date: "2025-02-20",
    value: 27500.00,
    paymentMethod: "À Vista",
    installments: 1,
    downPayment: 27500.00,
    email: "juliana.ferreira@email.com",
    phone: "(47) 92222-1111",
    cpf: "741.852.963-00",
    address: "Av. Central, 258",
    city: "Blumenau",
    state: "SC",
    model: "Yamaha XTZ 250",
    year: 2023,
    color: "Azul",
    plate: "STU-7890",
    status: "Concluída"
  },
  {
    id: 9,
    clientName: "Roberto Alves",
    product: "Moto tal de tal",
    date: "2025-02-18",
    value: 21000.00,
    paymentMethod: "Financiamento",
    installments: 48,
    downPayment: 5500.00,
    email: "roberto.alves@email.com",
    phone: "(47) 91111-0000",
    cpf: "369.258.147-00",
    address: "Rua das Acácias, 369",
    city: "Indaial",
    state: "SC",
    model: "Honda PCX 150",
    year: 2024,
    color: "Preta",
    plate: "VWX-1234",
    status: "Concluída"
  },
  {
    id: 10,
    clientName: "Fernanda Rocha",
    product: "Moto tal de tal",
    date: "2025-02-15",
    value: 16800.00,
    paymentMethod: "Cartão de Crédito",
    installments: 10,
    downPayment: 0,
    email: "fernanda.rocha@email.com",
    phone: "(47) 90000-9999",
    cpf: "147.258.369-00",
    address: "Rua Sete de Setembro, 741",
    city: "Timbó",
    state: "SC",
    model: "Yamaha Neo 125",
    year: 2023,
    color: "Vermelha",
    plate: "YZA-5678",
    status: "Concluída"
  },
  {
    id: 11,
    clientName: "Marcos Pereira",
    product: "Moto tal de tal",
    date: "2025-02-10",
    value: 29000.00,
    paymentMethod: "Financiamento",
    installments: 36,
    downPayment: 8000.00,
    email: "marcos.pereira@email.com",
    phone: "(47) 89999-8888",
    cpf: "258.369.147-00",
    address: "Av. Brasil, 852",
    city: "Rio do Sul",
    state: "SC",
    model: "Honda CB 650F",
    year: 2024,
    color: "Preta",
    plate: "BCD-9012",
    status: "Concluída"
  },
  {
    id: 12,
    clientName: "Luciana Mendes",
    product: "Moto tal de tal",
    date: "2025-02-08",
    value: 17200.00,
    paymentMethod: "À Vista",
    installments: 1,
    downPayment: 17200.00,
    email: "luciana.mendes@email.com",
    phone: "(47) 88888-7777",
    cpf: "963.741.852-00",
    address: "Rua das Palmeiras, 963",
    city: "Ibirama",
    state: "SC",
    model: "Suzuki Intruder 150",
    year: 2023,
    color: "Preta",
    plate: "EFG-3456",
    status: "Concluída"
  },
  {
    id: 13,
    clientName: "Ricardo Souza",
    product: "Moto tal de tal",
    date: "2025-02-05",
    value: 23500.00,
    paymentMethod: "Financiamento",
    installments: 48,
    downPayment: 6000.00,
    email: "ricardo.souza@email.com",
    phone: "(47) 87777-6666",
    cpf: "654.987.321-00",
    address: "Rua Principal, 456",
    city: "Blumenau",
    state: "SC",
    model: "Yamaha Factor 150",
    year: 2024,
    color: "Vermelha",
    plate: "HIJ-7890",
    status: "Concluída"
  },
  {
    id: 14,
    clientName: "Camila Dias",
    product: "Moto tal de tal",
    date: "2025-02-01",
    value: 20500.00,
    paymentMethod: "Cartão de Crédito",
    installments: 12,
    downPayment: 0,
    email: "camila.dias@email.com",
    phone: "(47) 86666-5555",
    cpf: "789.123.456-00",
    address: "Av. dos Estados, 159",
    city: "Indaial",
    state: "SC",
    model: "Honda NXR 160 Bros",
    year: 2024,
    color: "Vermelha",
    plate: "KLM-1234",
    status: "Concluída"
  },
  {
    id: 15,
    clientName: "Bruno Cardoso",
    product: "Moto tal de tal",
    date: "2025-01-28",
    value: 31000.00,
    paymentMethod: "Financiamento",
    installments: 60,
    downPayment: 9000.00,
    email: "bruno.cardoso@email.com",
    phone: "(47) 85555-4444",
    cpf: "321.789.654-00",
    address: "Rua da Paz, 753",
    city: "Timbó",
    state: "SC",
    model: "Kawasaki Z400",
    year: 2024,
    color: "Verde",
    plate: "NOP-5678",
    status: "Concluída"
  }
];



const SalesHistoryPage = () => {
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentosState>({
    termoGarantia: false,
    termoContrato: false,
    reservaDominio: true,
    instrumentoLiberacao: true,
  });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<string>("10");

  const totalPages = Math.ceil(mockSalesData.length / Number(itemsPerPage));
  const startIndex = (currentPage - 1) * Number(itemsPerPage);
  const endIndex = startIndex + Number(itemsPerPage);
  const currentSales = mockSalesData.slice(startIndex, endIndex);

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('pt-BR');

  // Função ajustada para gerar PDFs separados
  const gerarPDF = (sale: Sale, documentos: DocumentosState) => {
    const templates = [
      { key: 'termoGarantia', title: 'Termo de Garantia' },
      { key: 'termoContrato', title: 'Termo de Contrato Loja' },
      { key: 'reservaDominio', title: 'Reserva de Dominio' },
      { key: 'instrumentoLiberacao', title: 'Instrumento de Liberacao' }
    ];

    templates.forEach(template => {
      if (!documentos[template.key as keyof DocumentosState]) return;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(template.title, 20, 20);
      doc.setFontSize(12);
      doc.text(`Cliente: ${sale.clientName}`, 20, 40);
      doc.text(`Produto: ${sale.model} (${sale.year}) - Cor: ${sale.color}`, 20, 50);
      doc.text(`Placa: ${sale.plate}`, 20, 60);
      doc.text(`Valor: ${formatCurrency(sale.value)}`, 20, 70);
      doc.text(`Data da Venda: ${formatDate(sale.date)}`, 20, 80);

      doc.save(`${sale.id}-${template.title.replace(/\s+/g, "_")}.pdf`);
    });
  };

  const SaleCard = ({ sale }: { sale: Sale }) => (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">Nome do Cliente:</p>
            <p className="font-semibold text-foreground">{sale.clientName}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Venda:</p>
          <p className="text-foreground">{sale.product}</p>
        </div>
        <button
          onClick={() => setSelectedSale(sale)}
          className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1 mt-4 transition-colors"
        >
          Ver Dados Completos →
        </button>
      </div>
    </div>
  );
  const DetailModal = ({ sale, onClose }: { sale: Sale; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Detalhes da Venda</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações do cliente */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User size={20} className="text-orange-600" />
              Informações do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome Completo</p>
                <p className="font-medium text-foreground">{sale.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium text-foreground">{sale.cpf}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail size={14} /> Email
                </p>
                <p className="font-medium text-foreground">{sale.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone size={14} /> Telefone
                </p>
                <p className="font-medium text-foreground">{sale.phone}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin size={14} /> Endereço
                </p>
                <p className="font-medium text-foreground">
                  {sale.address}, {sale.city} - {sale.state}
                </p>
              </div>
            </div>
          </div>

          {/* Informações do Produto */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package size={20} className="text-orange-600" />
              Informações do Produto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium text-foreground">{sale.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ano</p>
                <p className="font-medium text-foreground">{sale.year}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cor</p>
                <p className="font-medium text-foreground">{sale.color}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placa</p>
                <p className="font-medium text-foreground">{sale.plate}</p>
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-orange-600" />
              Informações Financeiras
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="font-bold text-xl text-foreground">{formatCurrency(sale.value)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CreditCard size={14} /> Forma de Pagamento
                </p>
                <p className="font-medium text-foreground">{sale.paymentMethod}</p>
              </div>
              {sale.downPayment > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Entrada</p>
                  <p className="font-medium text-foreground">{formatCurrency(sale.downPayment)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Parcelas</p>
                <p className="font-medium text-foreground">
                  {sale.installments}x de {formatCurrency((sale.value - sale.downPayment) / sale.installments)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar size={14} /> Data da Venda
                </p>
                <p className="font-medium text-foreground">{formatDate(sale.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  {sale.status}
                </span>
              </div>
              <Button onClick={() => setDocumentosModalOpen(true)} className="mt-2 bg-black hover:bg-orange-700">
                Documentos →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Histórico de Vendas</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {currentSales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ver Menos</span>
            <Select
              value={itemsPerPage}
              onValueChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">Linha</span>
          </div>
        </div>
      </div>

      {selectedSale && (
        <DetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}

      {/* Modal Documentos */}
      <Dialog open={documentosModalOpen} onOpenChange={setDocumentosModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Documentos para Serem Emitidos</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Ao selecionar quais documentos serão emitidos os mesmos serão baixados via PDF
            </p>

            <div className="space-y-4">
              {['termoGarantia', 'termoContrato', 'reservaDominio', 'instrumentoLiberacao'].map((docKey) => (
                <div key={docKey} className="flex items-start space-x-3">
                  <Checkbox
                    id={docKey}
                    checked={documentos[docKey as keyof DocumentosState]}
                    onCheckedChange={(checked) =>
                      setDocumentos({ ...documentos, [docKey]: checked as boolean })
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor={docKey} className="text-base font-medium cursor-pointer">
                      {docKey === 'termoGarantia'
                        ? 'Termo de Garantia'
                        : docKey === 'termoContrato'
                        ? 'Termo de Contrato Loja'
                        : docKey === 'reservaDominio'
                        ? 'Reserva de Domínio'
                        : 'Instrumento de Liberação'}
                    </Label>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => {
                if (selectedSale) gerarPDF(selectedSale, documentos);
                setDocumentosModalOpen(false);
              }}
              className="w-full bg-black hover:bg-black/90 text-white"
            >
              Emitir Documentos →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesHistoryPage;