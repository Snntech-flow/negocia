import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { answerDialog, askConfirm, askText, currentDialog, subscribeDialogs, textDialogError } from "../src/lib/dialogs";

// A fila é do módulo: um teste que falha no meio deixa pedido pendurado e o seguinte esperaria para sempre.
function emptyQueue() {
  for (let request = currentDialog(); request; request = currentDialog()) answerDialog(request.id, null);
}

test("janela própria: um pedido de cada vez, na ordem, e cada resposta volta para quem perguntou", async () => {
  emptyQueue();
  let changes = 0;
  const unsubscribe = subscribeDialogs(() => { changes += 1; });
  const first = askConfirm({ title: "Excluir?" });
  const second = askText({ title: "Estornar?", label: "Motivo", minLength: 5 });
  const third = askConfirm({ title: "Suspender?" });
  assert.equal(currentDialog()?.title, "Excluir?", "mostra o primeiro pedido");
  assert.equal(changes, 3);

  answerDialog(currentDialog()!.id, true);
  assert.equal(await first, true);
  assert.equal(currentDialog()?.title, "Estornar?", "o seguinte só aparece depois da resposta");

  answerDialog(currentDialog()!.id, "  Pix de teste  ");
  assert.equal(await second, "Pix de teste", "texto volta sem espaços nas pontas");

  const id = currentDialog()!.id;
  answerDialog(id, false);
  answerDialog(id, true);
  assert.equal(await third, false, "cancelar vale; uma segunda resposta ao mesmo pedido é ignorada");
  assert.equal(currentDialog(), null);
  unsubscribe();
});

test("janela própria: cancelar o texto devolve null; resposta que não é sim conta como não", async () => {
  emptyQueue();
  const text = askText({ title: "Observação", label: "Opcional" });
  answerDialog(currentDialog()!.id, null);
  assert.equal(await text, null);
  const confirm = askConfirm({ title: "Recusar?" });
  answerDialog(currentDialog()!.id, "sim");
  assert.equal(await confirm, false);
});

test("janela própria: o campo de texto confere tamanho antes de responder", () => {
  assert.equal(textDialogError("", { minLength: 1 }), "Preencha este campo.");
  assert.equal(textDialogError("   ", { minLength: 1 }), "Preencha este campo.");
  assert.equal(textDialogError("abc", { minLength: 5 }), "Escreva pelo menos 5 caracteres.");
  assert.equal(textDialogError(" abcde ", { minLength: 5, maxLength: 300 }), null);
  assert.equal(textDialogError("x".repeat(301), { minLength: 5, maxLength: 300 }), "Escreva até 300 caracteres.");
  assert.equal(textDialogError("", {}), null, "campo opcional aceita vazio");
});

// As janelas nativas somem em navegador embutido e o botão "não faz nada" sem aviso: nenhuma tela usa.
test("nenhuma tela usa confirm/prompt/alert do navegador", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name)) files.push(path);
    }
  };
  walk(join(__dirname, "..", "src"));
  assert.ok(files.length > 20, "a varredura achou os arquivos do src");
  const native = /\b(?:window|globalThis|self)\s*\.\s*(?:confirm|prompt|alert)\b|(?<![.\w$])(?:confirm|prompt|alert)\s*\(/;
  const offenders = files.flatMap((path) => readFileSync(path, "utf8").split("\n")
    .map((line, index) => native.test(line) ? `${path}:${index + 1}: ${line.trim().slice(0, 120)}` : null)
    .filter((line): line is string => line !== null));
  assert.deepEqual(offenders, [], "use askConfirm/askText de src/lib/dialogs.ts");
});
