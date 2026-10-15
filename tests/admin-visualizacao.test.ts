import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdminPanel from "../src/components/AdminPanel";

const agora = new Date("2026-10-15T12:00:00Z");
const corretor = { id: "11111111-1111-4111-8111-111111111111", name: "Corretora Teste", email: "teste@exemplo.test", creci: "12345", whatsapp: "11900000000",
  avatarUrl: null, city: "Cidade", state: "BA", isVerified: false, verificationStatus: "pendente", plan: "10", subscriptionStatus: "teste", monthlyFee: "0.00",
  nextBillingDate: null, billingCycle: "mensal", role: "corretor", trustScore: 0, verificationReviewedAt: null, verificationReviewedBy: null,
  billingExemptAt: null, billingExemptBy: null, adminViewAccess: false, adminViewAccessBy: null, adminViewAccessAt: null, successfulDeals: 0, bypassReports: 0, createdAt: agora };
const pix = (id: string, status: string) => ({ id, userId: corretor.id, amount: "150.00", type: "mensalidade_pro", paymentMethod: "pix", status, description: "Mensalidade",
  createdAt: agora, confirmedAt: status === "pago" ? agora : null, confirmedBy: null, refundedAt: null, refundReason: null, userName: corretor.name, userCreci: corretor.creci });
const feedback = [{ id: "f1", userId: corretor.id, userName: corretor.name, category: "ideia", message: "Ideia de teste", status: "novo", createdAt: agora }];
const aba = (somenteLeitura: boolean, abaInicial: "clientes" | "faturamento") => renderToStaticMarkup(createElement(AdminPanel as never, {
  users: [corretor], transactions: [pix("t1", "pendente"), pix("t2", "pago")], feedback, currentUserId: "99999999-9999-4999-8999-999999999999",
  somenteLeitura, abaInicial, onUsersChange: () => undefined, onTransactionsChange: () => undefined, onFeedbackChange: () => undefined, onMessage: () => undefined }));
// As duas abas da Administração juntas: os botões de ação ficam espalhados entre elas.
const tela = (somenteLeitura: boolean) => aba(somenteLeitura, "clientes") + aba(somenteLeitura, "faturamento");

test("🔴 modo visualização: vê corretores, pagamentos e feedback, sem nenhum botão de ação", () => {
  const html = tela(true);
  assert.match(html, /Modo visualização/);
  assert.match(html, /Corretora Teste/);
  for (const acao of [/> ?Aprovar<\/button>/, /Isentar de cobrança/, /> ?Suspender<\/button>/, /Confirmar recebimento/, />Estornar<\/button>/, /Liberar visualização/]) {
    assert.doesNotMatch(html, acao, `apareceu no modo visualização: ${acao}`);
  }
  assert.match(html, /<select aria-label="Status do feedback"[^>]*disabled=""/);
});

test("administrador: as ações continuam e cada corretor ganha o botão de liberar a visualização", () => {
  const html = tela(false);
  assert.doesNotMatch(html, /Modo visualização/);
  for (const acao of [/> ?Aprovar<\/button>/, /Isentar de cobrança/, /> ?Suspender<\/button>/, /Confirmar recebimento/, />Estornar<\/button>/, /Liberar visualização da Administração/]) {
    assert.match(html, acao, `sumiu para o administrador: ${acao}`);
  }
});

test("🔴 a Administração tem duas abas: Clientes (corretores e feedback) e Faturamento e repasses (faturamento, repasses e Pix)", () => {
  const clientes = aba(false, "clientes"), faturamento = aba(false, "faturamento");
  for (const html of [clientes, faturamento]) {
    assert.match(html, /role="tablist" aria-label="Administração"/);
    assert.match(html, />Clientes</);
    assert.match(html, />Faturamento e repasses</);
    assert.match(html, /Receita confirmada/); // os números do topo valem para as duas
  }
  assert.match(clientes, /id="admin-aba-clientes"[^>]*aria-selected="true"/);
  assert.match(clientes, /Corretora Teste/);
  assert.match(clientes, /Feedback do piloto/);
  assert.doesNotMatch(clientes, /Faturamento da plataforma|Repasses aos sócios|Pagamentos via Pix/);
  assert.match(faturamento, /id="admin-aba-faturamento"[^>]*aria-selected="true"/);
  for (const secao of [/Faturamento da plataforma/, /Repasses aos sócios/, /Pagamentos via Pix/]) assert.match(faturamento, secao);
  assert.doesNotMatch(faturamento, /Feedback do piloto/);
});

test("🔴 coluna Vencimento para cada cliente: a data (vencido em destaque) ou o motivo de não ter", () => {
  const comVencimento = { ...corretor, id: "22222222-2222-4222-8222-222222222222", name: "Com Vencimento", nextBillingDate: new Date("2099-11-05T15:00:00Z"), subscriptionStatus: "ativo" };
  const isento = { ...corretor, id: "33333333-3333-4333-8333-333333333333", name: "Isenta", billingExemptAt: agora };
  const html = renderToStaticMarkup(createElement(AdminPanel as never, { users: [comVencimento, isento, corretor], transactions: [], feedback: [], currentUserId: "x",
    somenteLeitura: true, abaInicial: "clientes", onUsersChange: () => undefined, onTransactionsChange: () => undefined, onFeedbackChange: () => undefined, onMessage: () => undefined }));
  assert.match(html, /<th class="py-3 px-4">Vencimento<\/th>/);
  assert.match(html, /Vence em 05\/11\/2099/);
  assert.match(html, /todo dia 5/);
  assert.match(html, /Sem cobrança \(isento\)/);
  assert.match(html, /Sem vencimento definido/);
});
