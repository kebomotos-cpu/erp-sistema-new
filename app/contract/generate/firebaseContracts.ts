// app/contract/generate/firebaseContracts.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { saveAs } from "file-saver";
import HtmlDocx from "html-docx-js-typescript";

// --- Tipos ---
export type Parcela = {
  parcela: number;
  vencimento: string;   // "D/M/AAAA" ou "DD/MM/AAAA"
  valor: number;        // em reais
  especie: string;      // BOLETO | PIX | CARTÃO | ENTRADA...
};

type Venda = {
  id?: string;
  vendedorResponsavel?: string;
  vendedorCpf?: string;
  clienteNome?: string;
  cpf?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  marca?: string;
  modelo?: string;
  ano?: string | number;
  cor?: string;
  placa?: string;
  renavam?: string;
  chassi?: string;
  km?: string | number;
  valorVenda?: number;
  entrada?: string;
  entradaExtenso?: string;
  valorParcela?: string;
  valorParcelaExtenso?: string;

  // 🔧 Agora aceita string OU array
  parcelas?: string | Parcela[];

  // 🔧 HTML pronto da tabela (recomendado)
  parcelasTabelaHtml?: string;

  dataHoraEmissao?: string;
  dataVendaPorExtenso?: string;
  cidadeUpper?: string;
  detalhesPagamento?: string;
};

type ContractModels = Record<string, string>; // { [tipoContrato]: html }

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// --- helpers de formatação ---
const moneyBR = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Converte Parcela[] em texto simples (fallback se o template usar {{parcelas}})
function renderParcelasTexto(ps?: string | Parcela[]) {
  if (!ps) return "";
  if (typeof ps === "string") return ps;
  return ps
    .map(
      (p) =>
        `${p.parcela} - ${p.vencimento} - ${moneyBR(p.valor)} - ${p.especie}`
    )
    .join("\n");
}

export async function gerarContratoFirebase(venda: Venda, tipoContrato: string) {
  try {
    const docRef = doc(db, "contracts", "modeloBase");
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Documento modeloBase não encontrado.");

    const data = snap.data() as ContractModels;
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

    const vendedorDefault: Required<Pick<Venda, "vendedorResponsavel" | "vendedorCpf">> = {
      vendedorResponsavel: "KEBO MOTOS LTDA",
      vendedorCpf: "15.536.385/0001-83",
    };

    const htmlPreenchido = preencherCampos(modelo, {
      ...vendedorDefault,
      ...venda, // prioridade aos valores vindos da página
      dataHoraEmissao: venda.dataHoraEmissao ?? dataHoraEmissao,
      dataVendaPorExtenso: venda.dataVendaPorExtenso ?? dataVendaPorExtenso,
      cidadeUpper: venda.cidade?.toUpperCase() || "",
    });

    const maybeBlob = await HtmlDocx.asBlob(htmlPreenchido, { orientation: "portrait" });
    const blob: Blob =
      maybeBlob instanceof Blob ? maybeBlob : new Blob([maybeBlob as BlobPart], { type: DOCX_MIME });

    saveAs(blob, `${tipoContrato}_${venda.clienteNome ?? "cliente"}.docx`);
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar contrato: " + String(err));
  }
}

function preencherCampos(modelo: string, venda: Venda) {
  if (typeof modelo !== "string") return "";
  const safe = (v: unknown) => (v !== undefined && v !== null ? String(v) : "");

  // 🔧 suporta tanto {{parcelas}} (texto) quanto {{parcelasTabelaHtml}} (HTML)
  const parcelasTexto = renderParcelasTexto(venda.parcelas);
  const parcelasTabelaHtml = venda.parcelasTabelaHtml ?? "";

  return modelo
    .replace(/{{id}}/g, safe(venda.id))
    .replace(/{{vendedorResponsavel}}/g, safe(venda.vendedorResponsavel))
    .replace(/{{vendedorCpf}}/g, safe(venda.vendedorCpf))
    .replace(/{{clienteNome}}/g, safe(venda.clienteNome))
    .replace(/{{cpf}}/g, safe(venda.cpf))
    .replace(/{{endereco}}/g, safe(venda.endereco))
    .replace(/{{bairro}}/g, safe(venda.bairro))
    .replace(/{{cidade}}/g, safe(venda.cidade))
    .replace(/{{estado}}/g, safe(venda.estado))
    .replace(/{{cidadeUpper}}/g, safe(venda.cidadeUpper))
    .replace(/{{marca}}/g, safe(venda.marca))
    .replace(/{{modelo}}/g, safe(venda.modelo))
    .replace(/{{ano}}/g, safe(venda.ano))
    .replace(/{{cor}}/g, safe(venda.cor))
    .replace(/{{placa}}/g, safe(venda.placa))
    .replace(/{{renavam}}/g, safe(venda.renavam))
    .replace(/{{chassi}}/g, safe(venda.chassi))
    .replace(/{{km}}/g, safe(venda.km))
    .replace(
      /{{valorVenda}}/g,
      (venda.valorVenda ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    )
    .replace(/{{entrada}}/g, safe(venda.entrada))
    .replace(/{{entradaExtenso}}/g, safe(venda.entradaExtenso))
    .replace(/{{valorParcela}}/g, safe(venda.valorParcela))
    .replace(/{{valorParcelaExtenso}}/g, safe(venda.valorParcelaExtenso))

    // 🔧 agora funciona com texto OU array
    .replace(/{{parcelas}}/g, safe(parcelasTexto))

    // 🔧 placeholder para a tabela idêntica ao modelo
    .replace(/{{parcelasTabelaHtml}}/g, parcelasTabelaHtml)

    .replace(/{{detalhesPagamento}}/g, safe(venda.detalhesPagamento))
    .replace(/{{dataHoraEmissao}}/g, safe(venda.dataHoraEmissao))
    .replace(/{{dataVendaPorExtenso}}/g, safe(venda.dataVendaPorExtenso));
}
