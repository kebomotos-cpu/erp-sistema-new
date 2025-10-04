import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase/config"
import { saveAs } from "file-saver"
import htmlDocx from "html-docx-js/dist/html-docx"

export async function gerarContratoFirebase(venda: any, tipoContrato: string) {
  try {
    const docRef = doc(db, "contracts", "modeloBase")
    const snap = await getDoc(docRef)

    if (!snap.exists()) throw new Error("Documento modeloBase não encontrado.")

    const data = snap.data()
    const modelo = data[tipoContrato]

    if (!modelo) throw new Error(`Modelo '${tipoContrato}' não encontrado dentro de modeloBase.`)

    // 🕓 Data atual formatada (com hora)
    const dataHoraEmissao = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    // 🔤 Corrige encoding (garante UTF-8)
    const modeloUtf8 = new TextDecoder("utf-8").decode(new TextEncoder().encode(modelo))

    // ✍️ Substitui os campos dinâmicos
    const htmlPreenchido = preencherCampos(modeloUtf8, venda, dataHoraEmissao)

    // 🧾 Gera o DOCX
    const converted = htmlDocx.asBlob(htmlPreenchido)
    saveAs(converted, `${tipoContrato}_${venda.clienteNome}.docx`)
  } catch (err) {
    console.error(err)
    alert("Erro ao gerar contrato: " + err)
  }
}

function preencherCampos(texto: string, venda: any, dataVendaGerada: string) {
  if (typeof texto !== "string") return ""

  return texto
    .replace(/{{id}}/g, venda.id || "")
    .replace(/{{vendedorResponsavel}}/g, venda.vendedorResponsavel || "")
    .replace(/{{clienteNome}}/g, venda.clienteNome || "")
    .replace(/{{cpf}}/g, venda.cpf || "")
    .replace(/{{endereco}}/g, venda.endereco || "")
    .replace(/{{cidade}}/g, venda.cidade || "")
    .replace(/{{estado}}/g, venda.estado || "")
    .replace(/{{marca}}/g, venda.marca || "")
    .replace(/{{modelo}}/g, venda.modelo || "")
    .replace(/{{ano}}/g, venda.ano || "")
    .replace(/{{cor}}/g, venda.cor || "")
    .replace(/{{placa}}/g, venda.placa || "")
    .replace(/{{renavam}}/g, venda.renavam || "")
    .replace(/{{chassi}}/g, venda.chassi || "")
    .replace(/{{km}}/g, venda.km || "")
    .replace(/{{valorVenda}}/g, venda.valorVenda?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "")
    .replace(/{{entrada}}/g, venda.entrada || "")
    .replace(/{{dataHoraEmissao}}/g, dataVendaGerada || "")
}
