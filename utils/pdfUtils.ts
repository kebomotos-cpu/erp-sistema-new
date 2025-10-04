// import { jsPDF } from "jspdf"
// import { doc, getDoc } from "firebase/firestore"
// import { db } from "@/firebase/config"

// // Helpers
// function centerText(pdf: jsPDF, text: string, y: number, size = 12, bold = false) {
//   pdf.setFont("helvetica", bold ? "bold" : "normal")
//   pdf.setFontSize(size)
//   const pageW = pdf.internal.pageSize.getWidth()
//   const textW = pdf.getTextWidth(text)
//   pdf.text(text, (pageW - textW) / 2, y)
// }

// function drawTable(pdf: jsPDF, x: number, y: number, w: number, h: number, rows: [string, string, string, string][]) {
//   const colW = w / 2
//   const rowH = h / rows.length
//   pdf.setFont("helvetica", "normal")
//   pdf.setFontSize(11)

//   pdf.rect(x, y, w, rowH * rows.length)
//   for (let i = 1; i < rows.length; i++) pdf.line(x, y + rowH * i, x + w, y + rowH * i)
//   pdf.line(x + colW, y, x + colW, y + rowH * rows.length)

//   const pad = 8
//   rows.forEach((r, i) => {
//     const base = y + rowH * i + 16
//     pdf.text(`${r[0]}: ${r[1]}`, x + pad, base)
//     pdf.text(`${r[2]}: ${r[3]}`, x + colW + pad, base)
//   })
// }

// function drawSignatures(pdf: jsPDF, y: number, labels: string[]) {
//   const pageW = pdf.internal.pageSize.getWidth()
//   const margin = 60
//   const space = 200
//   const lineW = 180

//   labels.forEach((label, i) => {
//     const x = margin + i * (lineW + space)
//     pdf.line(x, y, x + lineW, y)
//     pdf.text(label, x + 40, y + 16)
//   })
// }

// // Substitui os placeholders do template Firestore
// function preencherTemplate(template: string, venda: any) {
//   return template
//     .replace(/{{clientName}}/g, venda.clienteNome)
//     .replace(/{{cpf}}/g, venda.cpf)
//     .replace(/{{marca}}/g, venda.marca)
//     .replace(/{{modelo}}/g, venda.modelo)
//     .replace(/{{placa}}/g, venda.placa)
//     .replace(/{{chassi}}/g, venda.chassi)
//     .replace(/{{renavam}}/g, venda.renavam)
//     .replace(/{{km}}/g, venda.km)
//     .replace(/{{ano}}/g, venda.ano)
//     .replace(/{{cor}}/g, venda.cor)
//     .replace(/{{endereco}}/g, venda.endereco || "-")
//     .replace(/{{cidade}}/g, venda.cidade || "RIO DO SUL")
//     .replace(/{{estado}}/g, venda.estado || "SC")
//     .replace(/{{valorVenda}}/g, String(venda.valorVenda))
//     .replace(/{{dataVenda}}/g, venda.dataVenda)
// }

// // ------------------------ FUNÇÃO PRINCIPAL ------------------------
// async function gerarPDFBase(tipo: string, venda: any, titulo: string, labelsAssinaturas: string[]) {
//   try {
//     const docRef = doc(db, "contracts", "modeloBase")
//     const snap = await getDoc(docRef)
//     if (!snap.exists()) throw new Error("Modelo de contratos não encontrado.")

//     const data = snap.data()
//     const template = data[tipo]
//     if (!template) throw new Error(`Template de ${tipo} ausente no Firestore.`)

//     const pdf = new jsPDF({ unit: "pt", format: "a4" })
//     const pageW = pdf.internal.pageSize.getWidth()

//     const texto = preencherTemplate(template, venda)
//     centerText(pdf, titulo, 60, 13, true)
//     const lines = pdf.splitTextToSize(texto, pageW - 120)
//     pdf.setFont("helvetica", "normal")
//     pdf.text(lines, 60, 100)

//     // Tabela do veículo
//     drawTable(pdf, 60, 400, pageW - 120, 26 * 4, [
//       ["MARCA", venda.marca || "-", "MODELO", venda.modelo || "-"],
//       ["ANO/MODELO", venda.ano || "-", "COR", venda.cor || "-"],
//       ["PLACA", venda.placa || "-", "RENAVAM", venda.renavam || "-"],
//       ["CHASSI", venda.chassi || "-", "KM", venda.km || "-"],
//     ])

//     // Local e assinatura
//     pdf.text(`${(venda.cidade || "RIO DO SUL").toUpperCase()}, ${venda.dataVenda}`, 60, 520)
//     drawSignatures(pdf, 560, labelsAssinaturas)

//     pdf.save(`${titulo}_${venda.clienteNome}.pdf`)
//   } catch (err: any) {
//     console.error(err)
//     throw new Error("Erro ao gerar PDF: " + err.message)
//   }
// }

// // ------------------------ CONTRATOS ESPECÍFICOS ------------------------
// export const gerarInstrumentoLiberacao = async (venda: any) =>
//   gerarPDFBase("instrumentoLiberacao", venda, "INSTRUMENTO DE LIBERAÇÃO", ["ASSINATURA"])

// export const gerarContratoLoja = async (venda: any) =>
//   gerarPDFBase("termoContrato", venda, "CONTRATO DE COMPRA E VENDA", ["VENDEDOR", "DEVEDOR", "AVALISTA"])

// export const gerarReservaDominio = async (venda: any) =>
//   gerarPDFBase("reservaDominio", venda, "CONTRATO DE COMPRA E VENDA COM RESERVA DE DOMÍNIO", ["CREDOR", "DEVEDOR"])

// export const gerarVendaRepasse = async (venda: any) =>
//   gerarPDFBase("vendaRepasse", venda, "CONTRATO DE VEÍCULO DE REPASSE", ["VENDEDOR", "COMPRADOR"])
