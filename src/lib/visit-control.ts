// Controle de visita a imóvel — a declaração do comprador que o corretor imprime para assinar no papel (11/10/2026).
//
// ⚖️ Sidney: "imprimir preenchido", a partir do modelo que ele mandou (CONTROLE-DE-VISITAS.docx): o possível comprador
// declara que conheceu o imóvel pelo corretor e que, se comprar por fora, paga a comissão (Lei 6.530/78). O sistema
// preenche o que sabe (corretor, CRECI/UF, imóvel, cliente, cidade, data); o resto o cliente completa à mão. Só imóvel à
// VENDA: o texto é de comprador e de percentual sobre o valor do bem — para aluguel não se inventa cláusula. A região do
// CRECI ("9ª Região") não é guardada: o texto diz CRECI/UF.

export type DadosDoControle = {
  numero: string;
  corretor: { nome: string; creci: string; uf: string | null };
  imovel: { codigo: string; tipo: string; titulo: string; bairro: string; cidade: string; valor: string };
  cliente: { nome: string; telefone: string | null };
  /** Data da visita, AAAA-MM-DD. */
  dataDaVisita: string;
};

export type ControleDeVisita = {
  titulo: string;
  declaracao: string[];
  imoveis: { imovel: string; endereco: string; valor: string }[];
  /** Linhas do declarante: valor vazio = o cliente preenche à mão. */
  declarante: { rotulo: string; valor: string }[];
  corretor: string;
  localEData: string;
};

export const PERCENTUAL_PADRAO = 6;
const EXTENSO = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze",
  "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Percentual da comissão: inteiro de 1 a 20 (o modelo escreve por extenso). */
export const percentualValido = (n: number) => Number.isInteger(n) && n >= 1 && n <= 20;

export function percentualPorExtenso(n: number): string {
  if (!percentualValido(n)) throw new Error("Informe um percentual inteiro de 1 a 20.");
  return `${n}% (${EXTENSO[n]} por cento)`;
}

export function dataPorExtenso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "____ de ______________ de ______";
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

export function valorEmReais(valor: string): string {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
}

const linha = (v: string) => v.replace(/\s+/g, " ").trim();

export function textoDoControle(d: DadosDoControle, percentual: number): ControleDeVisita {
  const creci = `CRECI n.º ${linha(d.corretor.creci)}${d.corretor.uf ? `/${d.corretor.uf}` : ""}`;
  const conselho = d.corretor.uf ? `CRECI/${d.corretor.uf}` : "CRECI";
  return {
    titulo: `CONTROLE DE VISITA A IMÓVEL N.º ${d.numero}`,
    declaracao: [
      `Declaro, na qualidade de possível comprador, ter tomado conhecimento “in loco” pela primeira vez, e tido todos os esclarecimentos referentes a preços e condições de pagamento, dos imóveis abaixo relacionados, através do corretor ${linha(d.corretor.nome)}, inscrito no ${creci}, e que todo e qualquer contrato com os proprietários do imóvel que venha a comprar dentre estes será feito através do corretor acima.`,
      `Declaro ainda que, se assim não proceder, me comprometo a pagar a comissão devida pelo serviço de corretagem equivalente a ${percentualPorExtenso(percentual)} sobre o valor do bem, de acordo com a tabela de honorários do ${conselho}, conforme a Lei 6.530/78.`,
    ],
    imoveis: [
      { imovel: `${linha(d.imovel.tipo)} “${linha(d.imovel.titulo)}” — código ${d.imovel.codigo}`, endereco: `${linha(d.imovel.bairro)}, ${linha(d.imovel.cidade)}`, valor: valorEmReais(d.imovel.valor) },
      // Linhas em branco para os outros imóveis visitados no mesmo dia, como no papel.
      ...Array.from({ length: 3 }, () => ({ imovel: "", endereco: "", valor: "" })),
    ],
    declarante: [
      { rotulo: "Nome do declarante", valor: linha(d.cliente.nome) },
      { rotulo: "CPF", valor: "" },
      { rotulo: "End. residencial", valor: "" },
      { rotulo: "End. trabalho", valor: "" },
      { rotulo: "Telefones", valor: d.cliente.telefone ? linha(d.cliente.telefone) : "" },
    ],
    corretor: `${linha(d.corretor.nome)} — ${creci}`,
    localEData: `${linha(d.imovel.cidade)}, ${dataPorExtenso(d.dataDaVisita)}`,
  };
}
