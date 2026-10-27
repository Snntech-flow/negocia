import assert from "node:assert/strict";
import test from "node:test";
import { signListingShare, verifyListingShare } from "../src/lib/listing-share";

process.env.NEGOCIAR_LAR_SESSION_SECRET ||= "test-session-secret-least-32-characters-long";

const P = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const OUTRO = "33333333-3333-3333-3333-333333333333";

test("round-trip: devolve o imóvel e o corretor do token", () => {
  assert.deepEqual(verifyListingShare(signListingShare(P, B)), { propertyId: P, brokerId: B });
});

test("🔴 token forjado é rejeitado: trocar o corretor no payload sem reassinar não passa", () => {
  const token = signListingShare(P, B);
  const sig = token.slice(token.lastIndexOf(".") + 1);
  const forjado = `${Buffer.from(`${P}.${OUTRO}`).toString("base64url")}.${sig}`;
  assert.equal(verifyListingShare(forjado), null);
});

test("lixo e tokens malformados são rejeitados", () => {
  assert.equal(verifyListingShare("xxx.yyy"), null);
  assert.equal(verifyListingShare(signListingShare(P, B) + "a"), null);
  assert.equal(verifyListingShare(""), null);
  assert.equal(verifyListingShare(`${Buffer.from("nao-uuid.tambem-nao").toString("base64url")}.abc`), null);
});
