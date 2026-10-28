// A tabela de preços da CONTA (⚖️ Sidney, 28/10/2026: "quem já assina mantém o preço atual").
// A renovação gerava o Pix pelo preço da tabela do dia: trocar a tabela subiria a próxima cobrança de quem já paga.
// Este guard trava as pontas que não têm teste de unidade: a migration (quem existe fica na v1, conta nova na v2), o esquema,
// o cadastro e a renovação lendo a tabela da conta.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(__dirname, "..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");
const MIGRATION = ler("supabase/migrations/20261028190000_users_price_table.sql");
const ESQUEMA = ler("src/lib/db/schema.ts");
const CADASTRO = ler("src/lib/actions/account.ts");
const RENOVACAO = ler("src/lib/actions/my-subscription.ts");

test("🔴 a migration põe quem JÁ existe na v1 e só depois muda o padrão para a v2", () => {
  const v1 = MIGRATION.indexOf("add column if not exists price_table text not null default 'v1'");
  const v2 = MIGRATION.indexOf("alter column price_table set default 'v2'");
  assert.ok(v1 >= 0, "a coluna nasce com padrão v1 — é o que preenche as contas que já existem");
  assert.ok(v2 > v1, "o padrão vira v2 DEPOIS de a coluna existir (conta nova)");
  assert.match(MIGRATION, /check \(price_table in \('v1', 'v2'\)\)/);
  assert.match(ESQUEMA, /priceTable: text\("price_table"\)\.default\("v2"\)\.notNull\(\)/);
});

test("🔴 o cadastro grava a tabela vigente e a renovação cobra pela tabela da conta", () => {
  assert.match(CADASTRO, /priceTable: CURRENT_PRICE_TABLE,/);
  assert.match(RENOVACAO, /amount: planCharge\(user\.plan, cycle, user\.priceTable\)/, "o Pix sai no preço da tabela da conta");
  assert.match(RENOVACAO, /monthlyFee: planMonthlyEquivalent\(user\.plan, cycle, user\.priceTable\)/);
  assert.match(RENOVACAO, /priceTable: users\.priceTable/, "a tela da assinatura recebe a tabela da conta");
});
