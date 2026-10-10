import assert from "node:assert/strict";
import test from "node:test";
import { whiteLabelContact, whiteLabelHtml, whiteLabelText } from "../src/lib/white-label";

const property = { title: "Apartamento <script>injetado</script>", city: "São Paulo", neighborhood: "Centro", salePrice: "300000", propertyType: "Apartamento", bedrooms: 2, bathrooms: 1, parkingSpots: 1, areaM2: "80", photos: [], ownerName: "PROPRIETÁRIO PRIVADO", ownerPhone: "CONTATO PRIVADO", confidentialAddress: "ENDEREÇO PRIVADO", broker: { name: "CAPTADOR PRIVADO" } };
const broker = { name: "Corretor parceiro", creci: "12345F", whatsapp: "(11) 90000-0001", avatar: "" };

test("ficha usa o contato do corretor conectado e exclui dados privados", () => {
  const contact = whiteLabelContact(property, broker)!;
  assert.equal(new URL(contact).pathname, "/5511900000001");
  assert.match(new URL(contact).searchParams.get("text")!, /Corretor parceiro/);
  for (const output of [whiteLabelText(property, broker), whiteLabelHtml(property, broker)]) {
    for (const secret of [property.ownerName, property.ownerPhone, property.confidentialAddress, property.broker.name]) assert.ok(!output.includes(secret));
    assert.ok(output.includes(broker.name));
  }
});
test("ficha imprimível escapa HTML e rejeita imagem executável e telefone inválido", () => {
  const html = whiteLabelHtml({ ...property, coverPhoto: "javascript:alert(1)" }, broker);
  assert.ok(!html.includes("<script>")); assert.ok(html.includes("&lt;script&gt;")); assert.ok(!html.includes("javascript:"));
  assert.equal(whiteLabelContact(property, { ...broker, whatsapp: "123" }), null);
});
test("ficha escreve singular e plural certos para quartos, banheiros e vagas", () => {
  for (const output of [whiteLabelText(property, broker), whiteLabelHtml(property, broker)]) assert.ok(output.includes("2 quartos · 1 banheiro · 1 vaga · 80 m²"));
  const roomy = { ...property, bedrooms: 1, bathrooms: 2, parkingSpots: 0 };
  for (const output of [whiteLabelText(roomy, broker), whiteLabelHtml(roomy, broker)]) assert.ok(output.includes("1 quarto · 2 banheiros · 0 vagas · 80 m²"));
});
