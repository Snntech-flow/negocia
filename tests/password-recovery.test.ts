import assert from "node:assert/strict";
import test from "node:test";
import { createResetToken, resetTokenHash, recoveryConfig } from "../src/lib/password-recovery";

test("reset tokens are unpredictable, hashed and expire in thirty minutes", () => {
  const first = createResetToken(), second = createResetToken();
  assert.notEqual(first.token, second.token); assert.equal(first.token.length, 64);
  assert.equal(first.tokenHash, resetTokenHash(first.token)); assert.notEqual(first.token, first.tokenHash);
  assert.ok(Math.abs(first.expiresAt.getTime() - Date.now() - 30 * 60_000) < 1000);
  for (const invalid of ["", "abc", "z".repeat(64), "a".repeat(10000)]) assert.throws(() => resetTokenHash(invalid), /inválido/);
});

test("recovery URLs come from configured HTTPS origin, not request headers", () => {
  const keys = ["RESEND_API_KEY", "NEGOCIAR_LAR_EMAIL_FROM", "NEGOCIAR_LAR_APP_URL"] as const;
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.RESEND_API_KEY = "test"; process.env.NEGOCIAR_LAR_EMAIL_FROM = "test@example.test";
    delete process.env.NEGOCIAR_LAR_APP_URL; assert.throws(recoveryConfig, /indisponível/);
    for (const invalid of ["http://evil.test", "https://user:pass@example.test", "javascript:alert(1)"]) {
      process.env.NEGOCIAR_LAR_APP_URL = invalid; assert.throws(recoveryConfig);
    }
    process.env.NEGOCIAR_LAR_APP_URL = "https://example.test/path?query=1";
    assert.equal(recoveryConfig().origin, "https://example.test");
  } finally { keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; }); }
});
