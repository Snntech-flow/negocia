import assert from "node:assert/strict";
import test from "node:test";
import { ActionError, GENERIC_ACTION_ERROR, isUniqueViolation, runAction, unwrap } from "../src/lib/action-result";

test("ação devolve a mensagem esperada como valor e esconde erro inesperado", async () => {
  assert.deepEqual(await runAction(async () => ({ id: 1 })), { ok: true, data: { id: 1 } });
  assert.deepEqual(await runAction(async () => { throw new ActionError("Seu cadastro ainda aguarda verificação."); }),
    { ok: false, error: "Seu cadastro ainda aguarda verificação." });
  const originalError = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    const result = await runAction(async () => { throw new Error("Failed query: insert into users\nparams: pessoa@exemplo.test,11999999999"); });
    assert.deepEqual(result, { ok: false, error: GENERIC_ACTION_ERROR });
    assert.ok(!JSON.stringify(logged).includes("pessoa@exemplo.test"), "o log não leva os parâmetros da consulta");
  } finally {
    console.error = originalError;
  }
});

test("a tela relança a mensagem do servidor e reconhece duplicidade embrulhada pelo Drizzle", () => {
  assert.equal(unwrap({ ok: true, data: 5 }), 5);
  assert.throws(() => unwrap({ ok: false, error: "E-mail ou senha incorretos." }), /E-mail ou senha incorretos/);
  assert.equal(isUniqueViolation({ cause: { code: "23505" } }), true);
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ cause: { code: "23503" } }), false);
  assert.equal(isUniqueViolation(null), false);
});
