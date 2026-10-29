// Aviso de feedback do piloto no sino dos administradores (28/10/2026) — Sidney: o feedback "aparece para a gente?". Aparecia
// só na Administração, e ninguém era avisado.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { avisoDeFeedback, TAMANHO_DO_TRECHO } from "../src/lib/aviso-de-feedback";

const ler = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("o aviso diz o tipo, quem mandou, a tela e o começo da mensagem", () => {
  const aviso = avisoDeFeedback({ nome: "Ana", screen: "cadastrar", category: "erro", message: "O botão\n  Salvar não responde." });
  assert.equal(aviso.title, "Feedback novo: Erro");
  assert.equal(aviso.message, "Ana · Meus imóveis: “O botão Salvar não responde.”");
  const longo = avisoDeFeedback({ nome: "Ana", screen: "vitrine", category: "ideia", message: "x".repeat(500) });
  assert.equal(longo.title, "Feedback novo: Sugestão");
  assert.ok(longo.message.endsWith("…”") && longo.message.length < TAMANHO_DO_TRECHO + 40, "mensagem longa vai cortada");
});

test("🔴 ao chegar feedback, cada administrador (menos quem mandou) ganha o aviso, na mesma transação", () => {
  const acao = ler("src/lib/actions/feedback.ts");
  const envio = acao.slice(acao.indexOf("export async function submitPilotFeedbackImpl"), acao.indexOf("export async function updatePilotFeedbackStatusImpl"));
  assert.match(envio, /const feedback = await db\.transaction\(async \(tx\) => \{/);
  assert.match(envio, /\.where\(and\(eq\(users\.role, "admin"\), ne\(users\.id, actor\.id\)\)\)/);
  assert.match(envio, /await tx\.insert\(notifications\)\.values\(administradores\.map\(\(admin\) => \(\{ userId: admin\.id, \.\.\.aviso, type: "feedback", read: false \}\)\)\)/);
});

test("🔴 o clique no aviso abre a Administração no Feedback do piloto, na aba Clientes", () => {
  assert.match(ler("src/components/app-shell/AppShellClient.tsx"), /else if \(notif\.type === "feedback"\) router\.push\(`\$\{href\("admin"\)\}#feedback-piloto`\);/);
  const painel = ler("src/components/AdminPanel.tsx");
  assert.match(painel, /<section id="feedback-piloto" className="scroll-mt-28 /);
  assert.match(painel, /window\.location\.hash === "#feedback-piloto"\) return "clientes";/);
});
