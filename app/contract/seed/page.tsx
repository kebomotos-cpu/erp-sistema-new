// // app/contracts/seed/page.tsx
// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { doc, setDoc } from "firebase/firestore"
// import { db } from "@/firebase/config"
// import { toast } from "sonner"

// const templates = {
//   instrumentoLiberacao: `INSTRUMENTO DE LIBERAÇÃO

// DECLARAMOS QUE O VEÍCULO ABAIXO CARACTERIZADO, FICA LIBERADO DE ÔNUS DE ALIENAÇÃO FIDUCIÁRIA E/OU RESERVA DE DOMÍNIO CONSTITUÍDA EM FUNÇÃO DE CONTRATO DE COMPRA E VENDA ESPECIFICADO, ESTANDO ASSIM OS ÓRGÃOS DE TRÂNSITO AUTORIZADOS A PROCEDER À BAIXA DO REFERIDO GRAVAME:

// CONTRATO Nº {{id}}

// NOME/RAZÃO SOCIAL: {{clientName}}
// CPF: {{cpf}}
// ENDEREÇO: {{endereco}}
// CIDADE: {{cidade}}-{{estado}}

// MARCA: {{marca}}    MODELO: {{modelo}}
// ANO/MODELO: {{ano}}    COR: {{cor}}
// PLACA: {{placa}}    RENAVAN: {{renavam}}
// CHASSI: {{chassi}}    KM: {{km}}

// {{cidade}}   {{dataVendaPorExtenso}}

// ____________________________________
// ASSINATURA`,

//   contratoLoja: `CONTRATO DE COMPRA E VENDA

// POR ESTE INSTRUMENTO PARTICULAR DE CONTRATO DE COMPRA E VENDA, COM RESERVA DE DOMÍNIO, DE UM LADO COMO

// VENDEDOR: KEBO MOTOS LTDA
// CNPJ: 15.536.385/0001-83
// ENDEREÇO: RIO DO SUL - SC

// DEVEDOR
// CLIENTE: {{clientName}}
// CPF: {{cpf}}
// ENDEREÇO: {{endereco}}
// CIDADE: {{cidade}}-{{estado}}

// Assina o presente contrato de compra e venda com reserva de domínio, do objeto abaixo descrito, sob as cláusulas e condições seguintes:

// PRIMEIRA - O vendedor tem justo e contratado com o comprador a venda de um veículo:

// MARCA: {{marca}}    MODELO: {{modelo}}    CILINDRADA: {{cilindrada}}
// ANO/MOD: {{ano}}    CHASSI: {{chassi}}
// COR: {{cor}}    COMBUSTIVEL: {{combustivel}}
// RENAVAN: {{renavam}}    PLACA: {{placa}}

// SEGUNDA - O comprador declara ter recebido o objeto do presente contrato em perfeito estado de funcionamento e com seus pertences.

// TERCEIRA - O comprador se obriga a efetuar os pagamentos na forma ajustada entre as partes.

// QUARTA - O inadimplemento de qualquer obrigação implicará o vencimento antecipado do saldo remanescente, na forma da lei.

// QUINTA - No caso de falência ou concordata do comprador, assiste ao vendedor o direito de reaver o objeto com todos os seus pertences e acessórios.

// SEXTA - Enquanto não integralizado o preço total, o comprador não poderá alienar, onerar, alugar ou ceder o uso do veículo, sem anuência do vendedor.

// DÉCIMA - Para dirimir as pendências do presente contrato, fica eleito o foro de RIO DO SUL / SC.

// E, por se acharem de pleno acordo, firmam o presente em 2 (duas) vias de igual teor e forma, perante duas testemunhas.

// __________________________        _______________________
// VENDEDOR: KEBO MOTOS LTDA         DEVEDOR: {{clientName}}

// __________________________________________
// AVALISTA`,

//   reservaDominio: `CONTRATO DE COMPRA E VENDA COM RESERVA DE DOMÍNIO   nº {{contratoNumero}}

// CREDOR
// NOME: {{credorNome}}
// CPF/CNPJ: {{credorCpfCnpj}}
// CIDADE: {{credorCidade}}-{{credorUF}}

// DEVEDOR
// NOME: {{clientName}}
// CPF: {{cpf}}
// ENDEREÇO: {{endereco}}
// CIDADE: {{cidade}}-{{estado}}

// AVALISTA
// NOME: {{avalistaNome}}
// CPF/CNPJ: {{avalistaCpfCnpj}}
// ENDEREÇO: {{avalistaEndereco}}

// 1. O CREDOR vende, COM RESERVA DE DOMÍNIO, ao DEVEDOR o veículo:

// MARCA: {{marca}}    MODELO: {{modelo}}
// ANO/MODELO: {{ano}}    COR: {{cor}}
// PLACA: {{placa}}    RENAVAN: {{renavam}}
// CHASSI: {{chassi}}    KM: {{km}}

// 2. NEGOCIAÇÃO DE VENDA.
// Obrigando-se o COMPRADOR a efetuar o pagamento nos seguintes prazos e valores: entrada de R$ {{entrada}}, mais {{qtdParcelas}} ({{qtdParcelasPorExtenso}}) parcelas de R$ {{valorParcela}} ({{valorParcelaPorExtenso}}).

// 3. O DEVEDOR obriga-se a manter o bem em perfeitas condições e em seu poder, respondendo pelos encargos e riscos.

// 4. A presente venda é feita com RESERVA DE DOMÍNIO a favor do CREDOR, constando no CRV a observação: "RESERVA DE DOMÍNIO A FAVOR DO CREDOR". O gravame se extingue com o integral pagamento da dívida.

// 5. O DEVEDOR não poderá ceder, locar, dar em comodato ou transferir direitos e obrigações sem anuência escrita do CREDOR.

// 6. O inadimplemento implicará o vencimento antecipado do débito, independente de aviso, notificação ou interpelação.

// {{cidade}}, {{dataVendaPorExtenso}}

// __________________________        _______________________
// CREDOR                           DEVEDOR`,

//   vendaRepasse: `CONTRATO DE VENDA DE VEÍCULO DE REPASSE

// VENDEDOR: CLEBERSON ABREU E CIA LTDA ME
// CNPJ: 15.536.385/0001-83

// COMPRADOR: {{clientName}}
// CPF: {{cpf}}
// ENDEREÇO: {{endereco}}
// CIDADE: {{cidade}}-{{estado}}

// As partes acima identificadas têm entre si justo e acertado o presente Contrato de Veículo de Repasse Usado (sem garantias), conforme abaixo:

// MARCA: {{marca}}    MODELO: {{modelo}}
// ANO/MODELO: {{ano}}    COR: {{cor}}
// PLACA: {{placa}}    RENAVAN: {{renavam}}
// CHASSI: {{chassi}}    KM: {{km}}

// O COMPRADOR adquire o veículo no estado em que se encontra, ciente da inexistência de garantias.

// {{cidade}}, {{dataVendaPorExtenso}}

// ____________________________________
// ASSINATURA DO COMPRADOR`
// }

// export default function SeedContractsPage() {
//   const [loading, setLoading] = useState(false)

//   const handleSeed = async () => {
//     try {
//       setLoading(true)
//       const ops = Object.entries(templates).map(([id, content]) =>
//         setDoc(
//           doc(db, "contracts", id),
//           { content, updatedAt: new Date().toISOString(), version: 1 },
//           { merge: true }
//         )
//       )
//       await Promise.all(ops)
//       toast.success("Modelos salvos/atualizados em Firestore (contracts/*).")
//     } catch (e: any) {
//       console.error(e)
//       toast.error("Erro ao salvar modelos no Firestore.")
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="p-8 space-y-4">
//       <h1 className="text-2xl font-bold">Seed de Contratos</h1>
//       <p className="text-sm text-muted-foreground">
//         Isto vai gravar/atualizar os documentos <code>contracts/instrumentoLiberacao</code>,{" "}
//         <code>contracts/contratoLoja</code>, <code>contracts/reservaDominio</code> e{" "}
//         <code>contracts/vendaRepasse</code> com o campo <code>content</code>.
//       </p>
//       <Button onClick={handleSeed} disabled={loading} className="bg-[#dc2626] text-white">
//         {loading ? "Gravando..." : "Gravar modelos no Firestore"}
//       </Button>
//     </div>
//   )
// }
