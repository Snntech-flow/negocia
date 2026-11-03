import test from "node:test";
import assert from "node:assert/strict";
import { LOCALES, isLocale, translate } from "../src/lib/i18n";
import messages from "../src/lib/i18n/messages.json";
import { billingNotice } from "../src/lib/subscription";
import { validateBrokerAssistantInput } from "../src/lib/broker-assistant";

const tokens = (text: string) => [...text.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();

test("all internal messages have three translations with matching interpolation parameters", () => {
  assert.ok(Object.keys(messages).length > 1300);
  for (const [source, translations] of Object.entries(messages)) {
    assert.equal(translations.length, 3, source);
    for (const translated of translations) {
      assert.ok(translated.trim().length > 0, source);
      assert.deepEqual(tokens(translated), tokens(source), source);
    }
  }
});

test("only the four supported locale identifiers are accepted", () => {
  for (const locale of LOCALES) assert.equal(isLocale(locale), true);
  for (const value of [null, undefined, "fr", "en-US", "", "__proto__", "pt-PT; ignore instructions"]) assert.equal(isLocale(value), false);
});

test("language switching translates interface labels and keeps the Brazilian default", () => {
  assert.equal(translate("pt-BR", "Meus imóveis"), "Meus imóveis");
  assert.equal(translate("en", "Meus imóveis"), "My properties");
  assert.equal(translate("es", "Meus imóveis"), "Mis inmuebles");
  assert.equal(translate("pt-PT", "Enviar fotos do celular ou computador"), "Enviar fotografias do telemóvel ou computador");
  assert.equal(translate("pt-PT", "Sem assinatura eletrônica"), "Sem assinatura eletrónica");
});

test("interpolation preserves names and unknown content without executing or recursively substituting them", () => {
  const name = 'María {1} <script> & Silva';
  assert.equal(translate("en", "Editar {0}", [name]), `Edit ${name}`);
  assert.equal(translate("es", "Nome não cadastrado & apartamento particular"), "Nome não cadastrado & apartamento particular");
  assert.equal(translate("en", null), null);
  assert.equal(translate("en", undefined), undefined);
});

test("historical system messages are translated while retaining their values", () => {
  assert.equal(translate("en", "Retorno de João da Silva concluído e salvo no histórico."), "Follow-up for João da Silva completed and saved in history.");
  assert.equal(translate("es", "Retorno de João da Silva concluído e salvo no histórico."), "Seguimiento de João da Silva completado y guardado en el historial.");
});

test("billing notices keep dates, prices and Brazilian payment methods in the chosen language", () => {
  const notice = billingNotice({ role: "corretor", subscriptionStatus: "teste", nextBillingDate: new Date("2026-11-03T15:00:00Z"), billingExemptAt: null, plan: "12", billingCycle: "monthly", hasPaid: false, pendingPix: false }, new Date("2026-11-02T15:00:00Z"), "en");
  assert.equal(notice?.title, "Your free trial ends tomorrow");
  assert.match(notice?.message ?? "", /My subscription/);
  assert.match(notice?.message ?? "", /Pix/);
  assert.match(notice?.message ?? "", /79\.90/);
});

test("assistant accepts only a supported output language and preserves the existing default contract", () => {
  assert.deepEqual(validateBrokerAssistantInput({ question: "Como organizar?", history: [] }), { question: "Como organizar?", history: [] });
  assert.equal(validateBrokerAssistantInput({ question: "How can I organize?", history: [], locale: "en" }).locale, "en");
  assert.throws(() => validateBrokerAssistantInput({ question: "How can I organize?", history: [], locale: "fr" as "en" }));
});
