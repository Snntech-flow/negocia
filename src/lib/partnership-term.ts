// Termo de Parceria entre corretores com cláusula de não atravessamento — o TEXTO (versão 1, 11/10/2026).
//
// Pedido da corretora piloto (vídeo de 11/10): a aba Documentos só mostrava uma prévia sem cláusulas. ⚖️ Sidney: termo de
// verdade, gerado com os dados de cada parceria e aceito pelos dois corretores na plataforma (assinatura eletrônica simples,
// Lei 14.063/2020). Texto jurídico: revisar com assessoria antes de mudar; toda mudança de texto sobe VERSAO_DO_TERMO (o aceite
// da versão anterior não vale para a nova). Sem data de geração no texto: o mesmo termo dá sempre a mesma impressão.

export const VERSAO_DO_TERMO = "1";
/** Prazo da proteção contra atravessamento depois do fim da parceria (cláusula 3). */
export const MESES_DE_PROTECAO = 12;

export type ParteDoTermo = { nome: string; creci: string; uf: string | null };

export type DadosDoTermo = {
  parceriaId: string;
  revisao: number;
  imovel: { id: string; titulo: string; tipo: string; finalidade: string; bairro: string; cidade: string; uf: string | null };
  captador: ParteDoTermo;
  parceiro: ParteDoTermo;
  indicador: { nome: string; creci: string | null } | null;
  percentuais: { captador: string; parceiro: string; indicador: string };
};

export type Clausula = { titulo: string; texto: string };
export type TermoDeParceria = { titulo: string; identificacao: string; partes: string[]; imovel: string; clausulas: Clausula[] };

export const codigoDaParceria = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();
const codigo = codigoDaParceria;
// Dado do cadastro entra numa linha só: quebra de linha num nome mudaria a forma do texto (e a impressão).
const linha = (v: string) => v.replace(/\s+/g, " ").trim();
const creci = (p: ParteDoTermo) => `CRECI ${linha(p.creci)}${p.uf ? `/${p.uf}` : ""}`;
const pct = (v: string) => `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
const FINALIDADE: Record<string, string> = { venda: "venda", locacao: "locação", aluguel: "locação", temporada: "temporada" };

export function textoDoTermo(d: DadosDoTermo): TermoDeParceria {
  const temIndicador = !!d.indicador && Number(d.percentuais.indicador) > 0;
  const divisao = `CAPTADOR ${pct(d.percentuais.captador)} e PARCEIRO ${pct(d.percentuais.parceiro)}`
    + (temIndicador ? `, e INDICADOR ${pct(d.percentuais.indicador)}` : "");
  const local = `${linha(d.imovel.bairro)}, ${linha(d.imovel.cidade)}${d.imovel.uf ? `/${d.imovel.uf}` : ""}`;
  return {
    titulo: "TERMO DE PARCERIA ENTRE CORRETORES DE IMÓVEIS COM CLÁUSULA DE NÃO ATRAVESSAMENTO",
    identificacao: `Parceria ${codigo(d.parceriaId)} · versão ${VERSAO_DO_TERMO} do termo · divisão da comissão: revisão ${d.revisao}`,
    partes: [
      `CAPTADOR: ${linha(d.captador.nome)}, ${creci(d.captador)}.`,
      `PARCEIRO: ${linha(d.parceiro.nome)}, ${creci(d.parceiro)}.`,
      ...(temIndicador ? [`INDICADOR (não assina na plataforma; recebe a parte indicada na cláusula 2): ${linha(d.indicador!.nome)}${d.indicador!.creci ? `, CRECI ${linha(d.indicador!.creci)}` : ""}.`] : []),
    ],
    imovel: `IMÓVEL: ${linha(d.imovel.tipo)} "${linha(d.imovel.titulo)}", para ${FINALIDADE[d.imovel.finalidade] ?? d.imovel.finalidade}, em ${local}, código ${codigo(d.imovel.id)}, captado pelo CAPTADOR na NegociaLar.`,
    clausulas: [
      { titulo: "1. Objeto", texto: "As partes atuarão em parceria (co-corretagem) na intermediação do imóvel acima: o CAPTADOR responde pelo imóvel e pelo relacionamento com o proprietário; o PARCEIRO, pelo cliente que apresentar." },
      { titulo: "2. Comissão", texto: `A comissão efetivamente recebida pela intermediação será dividida conforme a revisão ${d.revisao} da divisão confirmada na NegociaLar: ${divisao}. Cada parte responde pelos próprios tributos e recibos.` },
      { titulo: "3. Não atravessamento", texto: `Durante a parceria e por ${MESES_DE_PROTECAO} meses após o seu encerramento: (a) o PARCEIRO não negociará o imóvel diretamente com o proprietário, nem por meio de terceiros, fora desta parceria; (b) o CAPTADOR não negociará o imóvel diretamente com o cliente apresentado pelo PARCEIRO, nem por meio de terceiros, fora desta parceria. Se o negócio do imóvel com esse cliente for fechado fora da parceria nesse prazo, a parte prejudicada terá direito à sua parte da comissão como se o negócio tivesse sido feito nesta parceria.` },
      { titulo: "4. Sigilo e dados pessoais", texto: "O endereço protegido do imóvel e os dados do proprietário e do cliente são confidenciais e só podem ser usados nesta negociação, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018)." },
      { titulo: "5. Sem exclusividade", texto: "Este termo não dá exclusividade sobre o imóvel nem sobre o cliente além do previsto aqui." },
      { titulo: "6. Encerramento", texto: "A parceria termina com o fechamento do negócio, com a recusa registrada na NegociaLar ou com a retirada do imóvel; a cláusula 3 continua valendo pelo prazo nela previsto." },
      { titulo: "7. Aceite eletrônico", texto: "As partes aceitam este termo por meio eletrônico na NegociaLar, que registra a data, a hora, o endereço IP e a impressão digital (sha-256) deste texto — assinatura eletrônica simples (Lei 14.063/2020). Se a divisão da comissão mudar, um novo termo é gerado e precisa de novo aceite." },
      { titulo: "8. A NegociaLar", texto: "A NegociaLar oferece a plataforma e o registro dos aceites; não é parte deste termo nem responde pelas obrigações entre os corretores." },
    ],
  };
}

/** O texto canônico que recebe a impressão sha-256: o mesmo termo, sempre o mesmo texto (uma linha por bloco). */
export function textoCanonico(t: TermoDeParceria): string {
  return [t.titulo, t.identificacao, ...t.partes, t.imovel, ...t.clausulas.map((c) => `${c.titulo}\n${c.texto}`)].join("\n\n");
}

/** Blocos para exibir o texto canônico: o 1º é o título; bloco com mais de uma linha é cláusula (1ª linha = título dela). */
export function blocosDoTermo(texto: string): { titulo: string | null; texto: string }[] {
  return texto.split("\n\n").map((bloco) => {
    const [primeira, ...resto] = bloco.split("\n");
    return resto.length ? { titulo: primeira, texto: resto.join("\n") } : { titulo: null, texto: primeira };
  });
}

export type AceiteGravado = { userId: string; commissionRevision: number; textHash: string; termText: string; acceptedAt: Date; ip: string | null };
export type SituacaoDaParte = { situacao: "aceito" | "texto_anterior" | "pendente"; aceitoEm: Date | null; ip: string | null };
export type SituacaoDoTermo = { assinado: boolean; texto: string; impressao: string; captador: SituacaoDaParte; parceiro: SituacaoDaParte };

/**
 * Quem aceitou o quê na revisão atual da divisão. Assinado = os dois aceitaram o MESMO texto, e vale o texto gravado (mesmo
 * que o cadastro do imóvel mude depois, ou que o termo ganhe versão nova). Sem assinatura, o termo é o texto de agora
 * (`atual`; null quando a divisão ainda não foi confirmada pelos dois) e quem aceitou outro texto precisa aceitar de novo.
 */
export function situacaoDoTermo(p: {
  captadorId: string; parceiroId: string; revisao: number; atual: { texto: string; impressao: string } | null; aceites: AceiteGravado[];
}): SituacaoDoTermo | null {
  const daRevisao = p.aceites.filter((a) => a.commissionRevision === p.revisao);
  const doCaptador = daRevisao.filter((a) => a.userId === p.captadorId);
  const doParceiro = daRevisao.filter((a) => a.userId === p.parceiroId);
  const parte = (a: AceiteGravado): SituacaoDaParte => ({ situacao: "aceito", aceitoEm: a.acceptedAt, ip: a.ip });
  const assinaturas = doCaptador.flatMap((c) => doParceiro.filter((b) => b.textHash === c.textHash).map((b) => ({ c, b })))
    .sort((x, y) => Math.max(+y.c.acceptedAt, +y.b.acceptedAt) - Math.max(+x.c.acceptedAt, +x.b.acceptedAt));
  if (assinaturas.length) {
    const { c, b } = assinaturas[0];
    return { assinado: true, texto: c.termText, impressao: c.textHash, captador: parte(c), parceiro: parte(b) };
  }
  if (!p.atual) return null;
  const atual = p.atual;
  const situacao = (lista: AceiteGravado[]): SituacaoDaParte => {
    const aceito = lista.find((a) => a.textHash === atual.impressao);
    return aceito ? parte(aceito) : { situacao: lista.length ? "texto_anterior" : "pendente", aceitoEm: null, ip: null };
  };
  return { assinado: false, texto: atual.texto, impressao: atual.impressao, captador: situacao(doCaptador), parceiro: situacao(doParceiro) };
}
