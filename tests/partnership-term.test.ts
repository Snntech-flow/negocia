import assert from "node:assert/strict";
import test from "node:test";
import { blocosDoTermo, MESES_DE_PROTECAO, situacaoDoTermo, textoCanonico, textoDoTermo, VERSAO_DO_TERMO, type AceiteGravado, type DadosDoTermo } from "../src/lib/partnership-term";

const dados = (mudar: Partial<DadosDoTermo> = {}): DadosDoTermo => ({
  parceriaId: "3f2a9c1e-0000-4000-8000-000000000001",
  revisao: 2,
  imovel: { id: "7b1c0d2e-0000-4000-8000-000000000002", titulo: "Casa com quintal", tipo: "Casa Solta", finalidade: "venda", bairro: "Centro", cidade: "Salvador", uf: null },
  captador: { nome: "Corretora Captadora", creci: "16952", uf: "BA" },
  parceiro: { nome: "Corretor Parceiro", creci: "12345-F", uf: "SP" },
  indicador: null,
  percentuais: { captador: "50.00", parceiro: "50.00", indicador: "0.00" },
  ...mudar,
});

test("termo: dados da parceria no texto, divisão da revisão e prazo de proteção", () => {
  const termo = textoDoTermo(dados());
  assert.equal(termo.identificacao, `Parceria 3F2A9C1E · versão ${VERSAO_DO_TERMO} do termo · divisão da comissão: revisão 2`);
  assert.deepEqual(termo.partes, ["CAPTADOR: Corretora Captadora, CRECI 16952/BA.", "PARCEIRO: Corretor Parceiro, CRECI 12345-F/SP."]);
  assert.match(termo.imovel, /^IMÓVEL: Casa Solta "Casa com quintal", para venda, em Centro, Salvador, código 7B1C0D2E/);
  const comissao = termo.clausulas.find((c) => c.titulo === "2. Comissão")!;
  assert.match(comissao.texto, /revisão 2 da divisão confirmada na NegociaLar: CAPTADOR 50% e PARCEIRO 50%\./);
  assert.match(termo.clausulas.find((c) => c.titulo === "3. Não atravessamento")!.texto, new RegExp(`por ${MESES_DE_PROTECAO} meses após o seu encerramento`));
  assert.equal(termo.clausulas.length, 8);
});

test("termo: indicador só entra com parte maior que zero", () => {
  const indicador = { nome: "Indicador Externo", creci: "TESTE-01" };
  const com = textoDoTermo(dados({ indicador, percentuais: { captador: "40.00", parceiro: "40.00", indicador: "20.00" } }));
  assert.equal(com.partes.length, 3);
  assert.match(com.partes[2], /^INDICADOR \(não assina na plataforma; .*\): Indicador Externo, CRECI TESTE-01\.$/);
  assert.match(com.clausulas[1].texto, /CAPTADOR 40% e PARCEIRO 40%, e INDICADOR 20%\./);
  const zerado = textoDoTermo(dados({ indicador, percentuais: { captador: "50.00", parceiro: "50.00", indicador: "0.00" } }));
  assert.equal(zerado.partes.length, 2);
  assert.doesNotMatch(textoCanonico(zerado), /INDICADOR/);
});

test("termo: quebra de linha no cadastro não muda a forma do texto; o texto canônico volta em blocos", () => {
  const sujo = textoCanonico(textoDoTermo(dados({ captador: { nome: "Corretora\n  Captadora", creci: " 16952 ", uf: "BA" }, imovel: { ...dados().imovel, titulo: "Casa com\nquintal" } })));
  assert.equal(sujo, textoCanonico(textoDoTermo(dados())));
  const blocos = blocosDoTermo(sujo);
  assert.equal(blocos[0].texto, "TERMO DE PARCERIA ENTRE CORRETORES DE IMÓVEIS COM CLÁUSULA DE NÃO ATRAVESSAMENTO");
  assert.equal(blocos[0].titulo, null);
  assert.deepEqual(blocos.filter((b) => b.titulo).map((b) => b.titulo), ["1. Objeto", "2. Comissão", "3. Não atravessamento", "4. Sigilo e dados pessoais", "5. Sem exclusividade", "6. Encerramento", "7. Aceite eletrônico", "8. A NegociaLar"]);
});

test("situação do termo: pendente, aceito por um, texto anterior e assinado pelo texto gravado", () => {
  const C = "captador", P = "parceiro";
  const aceite = (userId: string, textHash: string, minuto: number, commissionRevision = 2): AceiteGravado =>
    ({ userId, commissionRevision, textHash, termText: `texto ${textHash}`, acceptedAt: new Date(Date.UTC(2026, 9, 11, 14, minuto)), ip: null });
  const atual = { texto: "texto B", impressao: "B" };
  const base = { captadorId: C, parceiroId: P, revisao: 2, atual };

  const nada = situacaoDoTermo({ ...base, aceites: [] })!;
  assert.deepEqual([nada.assinado, nada.captador.situacao, nada.parceiro.situacao, nada.texto], [false, "pendente", "pendente", "texto B"]);

  const um = situacaoDoTermo({ ...base, aceites: [aceite(P, "B", 1)] })!;
  assert.deepEqual([um.assinado, um.captador.situacao, um.parceiro.situacao], [false, "pendente", "aceito"]);

  // O parceiro aceitou o texto A; o cadastro mudou (texto B) antes do captador aceitar: o parceiro aceita de novo.
  const anterior = situacaoDoTermo({ ...base, aceites: [aceite(P, "A", 1), aceite(C, "B", 2)] })!;
  assert.deepEqual([anterior.assinado, anterior.captador.situacao, anterior.parceiro.situacao], [false, "aceito", "texto_anterior"]);

  // Os dois aceitaram A: assinado, e vale o texto gravado — mesmo que o texto de agora seja outro ou nem exista.
  const assinado = situacaoDoTermo({ ...base, aceites: [aceite(P, "A", 1), aceite(C, "A", 2), aceite(C, "B", 3)] })!;
  assert.deepEqual([assinado.assinado, assinado.texto, assinado.impressao], [true, "texto A", "A"]);
  assert.equal(assinado.captador.aceitoEm?.toISOString(), "2026-10-11T14:02:00.000Z");
  assert.equal(situacaoDoTermo({ ...base, atual: null, aceites: [aceite(P, "A", 1), aceite(C, "A", 2)] })?.assinado, true);

  // Aceites de outra revisão da divisão não contam: divisão nova, termo novo.
  const revisaoVelha = situacaoDoTermo({ ...base, aceites: [aceite(P, "A", 1, 1), aceite(C, "A", 2, 1)] })!;
  assert.deepEqual([revisaoVelha.assinado, revisaoVelha.captador.situacao, revisaoVelha.parceiro.situacao], [false, "pendente", "pendente"]);

  // Sem divisão confirmada e sem assinatura nesta revisão, não há termo.
  assert.equal(situacaoDoTermo({ ...base, atual: null, aceites: [aceite(P, "A", 1)] }), null);
});
