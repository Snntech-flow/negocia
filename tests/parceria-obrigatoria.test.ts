// ⚖️ Parceria obrigatória (01/11/2026, Sidney, sobre "Imóvel sem parceria fica só na carteira de quem cadastrou" na página
// inicial: "tirar esse texto e obrigar a pôr a parceria"). Revoga o "manter a carteira" de 14/10: todo imóvel aceita parceria.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { conferirParceriaDoCadastro, edicaoPedeConfirmacao, PARCERIA_OBRIGATORIA } from "../src/lib/partnership-models";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const obrigatoria = (e: unknown) => e instanceof Error && e.message === PARCERIA_OBRIGATORIA;

test("🔴 cadastro: sem parceria não grava; com a condição escolhida e confirmada, grava", () => {
  for (const acceptsPartnership of [false, undefined, "true", 1]) {
    assert.throws(() => conferirParceriaDoCadastro({ acceptsPartnership, partnershipModels: "50_50", confirmaParceria: true }), obrigatoria);
  }
  assert.throws(() => conferirParceriaDoCadastro({ acceptsPartnership: true, confirmaParceria: true }), /Escolha a condição de parceria/);
  assert.throws(() => conferirParceriaDoCadastro({ acceptsPartnership: true, partnershipModels: "60_40", confirmaParceria: true }), /Escolha a condição de parceria/);
  assert.throws(() => conferirParceriaDoCadastro({ acceptsPartnership: true, partnershipModels: "50_50" }), /confirme que este imóvel aceita parceria/);
  assert.equal(conferirParceriaDoCadastro({ acceptsPartnership: true, partnershipModels: "40_40_20", confirmaParceria: true }), "40_40_20");
});

test("🔴 edição: não tira o imóvel da parceria; o antigo fora da rede só salva confirmando", () => {
  const confirmado = { acceptsPartnership: true, partnershipReviewPending: false, partnershipModels: "ambos" };
  assert.throws(() => edicaoPedeConfirmacao(confirmado, { acceptsPartnership: false, partnershipModels: "ambos" }), obrigatoria);
  assert.equal(edicaoPedeConfirmacao(confirmado, { acceptsPartnership: true, partnershipModels: "ambos" }), false, "nada mudou: não pede de novo");
  assert.equal(edicaoPedeConfirmacao(confirmado, { acceptsPartnership: true, partnershipModels: "50_50" }), true, "trocou a condição");
  assert.equal(edicaoPedeConfirmacao({ ...confirmado, partnershipReviewPending: true }, { acceptsPartnership: true, partnershipModels: "ambos" }), true, "em revisão");
  assert.equal(edicaoPedeConfirmacao({ ...confirmado, acceptsPartnership: false }, { acceptsPartnership: true, partnershipModels: "ambos" }), true, "estava fora da rede");
});

test("🔴 as ações do servidor usam a regra e gravam sempre com parceria", () => {
  const cadastro = ler("src/lib/actions/property.ts");
  assert.match(cadastro, /const partnershipModels = conferirParceriaDoCadastro\(formData\);/);
  assert.match(cadastro, /acceptsPartnership: true,\n\s+splitPercentage/);
  assert.match(cadastro, /partnershipConfirmedAt: new Date\(\),/);
  const edicao = ler("src/lib/actions/property-inventory.ts");
  assert.match(edicao, /const precisaConfirmar = edicaoPedeConfirmacao\(current, changes\);/);
  assert.doesNotMatch(edicao, /naRede/);
});

test("🔴 telas: sem a opção de deixar só na carteira; o antigo fora da rede aparece para escolher a parceria", () => {
  const cadastro = ler("src/components/PropertyCreateForm.tsx");
  assert.doesNotMatch(cadastro, /setAcceptsPartnership|Oferecer na rede para parceria|Salvar imóvel na minha carteira/);
  assert.match(cadastro, /acceptsPartnership: true, partnershipModels: partnershipModels \?\? undefined, confirmaParceria,/);
  const meus = ler("src/components/PropertyInventory.tsx");
  assert.doesNotMatch(meus, /Disponível para parceria/);
  assert.match(meus, /input\.acceptsPartnership = true;/);
  assert.match(meus, /data-aviso-fora-da-rede=""/);
  assert.doesNotMatch(ler("src/components/app-shell/CadastrarRouteClient.tsx"), /Imóvel salvo na sua carteira/);
});

test("🔴 página inicial: saiu 'imóvel sem parceria fica só na carteira'; a dúvida frequente diz que não dá", () => {
  const pagina = ler("src/components/LandingPage.tsx");
  assert.doesNotMatch(pagina, /carteira de quem cadastrou/);
  assert.doesNotMatch(pagina, /Pode, mas ele fica só na sua carteira/);
  assert.match(pagina, /Todo imóvel do Negocia Lar aceita parceria\. Quem publica informa a condição/);
  assert.match(pagina, /a: "Não\. No Negocia Lar todo imóvel aceita parceria/);
});
