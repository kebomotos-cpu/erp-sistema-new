import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { saveAs } from "file-saver";
import HtmlDocx from "html-docx-js-typescript";

export async function gerarContratoFirebase(venda: any, tipoContrato: string) {
  try {
    const docRef = doc(db, "contracts", "modeloBase");
    const snap = await getDoc(docRef);

    if (!snap.exists()) throw new Error("Documento modeloBase não encontrado.");

    const data = snap.data();
    const modelo = data[tipoContrato];
    if (!modelo) throw new Error(`Modelo '${tipoContrato}' não encontrado dentro de modeloBase.`);

    const dataHoraEmissao = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const dataVendaPorExtenso = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const vendedorDefault = {
      vendedorResponsavel: "IRAN DE SOUZA",
      vendedorCpf: "15.536.385/0001-83",
    };

    const htmlPreenchido = preencherCampos(modelo, {
      ...vendedorDefault,
      ...venda, // sobrescreve se vier do Firestore
      dataHoraEmissao,
      dataVendaPorExtenso,
      cidadeUpper: venda.cidade?.toUpperCase() || "",
    });

    // Gera DOCX
    const result = await HtmlDocx.asBlob(htmlPreenchido, { orientation: "portrait" });

    const blob =
      result instanceof Blob
        ? result
        : new Blob([Uint8Array.from(result as any)], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

    saveAs(blob, `${tipoContrato}_${venda.clienteNome}.docx`);
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar contrato: " + err);
  }
}

function preencherCampos(modelo: string, venda: any) {
  if (typeof modelo !== "string") return "";

  return modelo
    .replace(/{{id}}/g, venda.id || "")
    .replace(/{{vendedorResponsavel}}/g, venda.vendedorResponsavel || "")
    .replace(/{{vendedorCpf}}/g, venda.vendedorCpf || "")
    .replace(/{{clienteNome}}/g, venda.clienteNome || "")
    .replace(/{{cpf}}/g, venda.cpf || "")
    .replace(/{{endereco}}/g, venda.endereco || "")
    .replace(/{{bairro}}/g, venda.bairro || "")
    .replace(/{{cidade}}/g, venda.cidade || "")
    .replace(/{{estado}}/g, venda.estado || "")
    .replace(/{{cidadeUpper}}/g, venda.cidadeUpper || "")
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
    .replace(/{{entradaExtenso}}/g, venda.entradaExtenso || "")
    .replace(/{{valorParcela}}/g, venda.valorParcela || "")
    .replace(/{{valorParcelaExtenso}}/g, venda.valorParcelaExtenso || "")
    .replace(/{{parcelas}}/g, venda.parcelas || "")
    .replace(/{{dataHoraEmissao}}/g, venda.dataHoraEmissao || "")
    .replace(/{{dataVendaPorExtenso}}/g, venda.dataVendaPorExtenso || "");
}
