import assert from "node:assert/strict";
import test from "node:test";
import { detectImageType, hasCameraMetadata, photoStorageConfig, storePhoto } from "../src/lib/photo-upload";

const jpeg = (segments: number[][]) => new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xda, 0, 2, 1, 2, 3, 0xff, 0xd9]);
const segment = (marker: number, payload: number[]) => [0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload];
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

test("tipo da foto vem do conteúdo, não do nome", () => {
  assert.equal(detectImageType(jpeg([])), "image/jpeg");
  assert.equal(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
  assert.equal(detectImageType(new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")])), "image/webp");
  assert.equal(detectImageType(new Uint8Array(ascii("<svg onload=alert(1)>"))), null);
  assert.equal(detectImageType(new Uint8Array(ascii("GIF89a"))), null);
});

test("foto com dados de câmera (EXIF, onde fica o GPS) é recusada", () => {
  assert.equal(hasCameraMetadata(jpeg([segment(0xe0, ascii("JFIF\0"))]), "image/jpeg"), false);
  assert.equal(hasCameraMetadata(jpeg([segment(0xe0, ascii("JFIF\0")), segment(0xe1, [...ascii("Exif"), 0, 0, 1, 2])]), "image/jpeg"), true);
  // "Exif" dentro da imagem comprimida não é cabeçalho de câmera.
  assert.equal(hasCameraMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2, ...ascii("Exif"), 0, 0]), "image/jpeg"), false);
  assert.equal(hasCameraMetadata(new Uint8Array([0x89, ...ascii("PNG"), ...ascii("eXIf")]), "image/png"), true);
});

test("envio usa o Storage pelo servidor, com caminho do corretor e URL pública", async () => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  try {
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(photoStorageConfig(), null);
    process.env.SUPABASE_URL = "http://projeto.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
    assert.equal(photoStorageConfig(), null, "exige HTTPS");
    process.env.SUPABASE_URL = "https://evil.example.com";
    assert.equal(photoStorageConfig(), null, "só domínio do Supabase");
    process.env.SUPABASE_URL = "https://projeto.supabase.co";
    const config = photoStorageConfig();
    assert.ok(config);
    const calls: { url: string; init?: RequestInit }[] = [];
    const fake = (async (url: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(url), init }); return new Response("{}", { status: 200 }); }) as typeof fetch;
    const url = await storePhoto(jpeg([]), "image/jpeg", "11111111-1111-4111-8111-111111111111", config, fake);
    assert.match(calls[0].url, /^https:\/\/projeto\.supabase\.co\/storage\/v1\/object\/imoveis\/11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}\.jpg$/);
    assert.equal((calls[0].init?.headers as Record<string, string>)["Content-Type"], "image/jpeg");
    // storePhoto agora devolve o CAMINHO do objeto (não a URL pública) — o bucket é privado e a
    // exibição assina na leitura (ver photo-sign.ts).
    assert.match(url, /^11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}\.jpg$/);
    const failing = (async () => new Response("erro", { status: 500 })) as typeof fetch;
    await assert.rejects(storePhoto(jpeg([]), "image/jpeg", "u", config, failing));
  } finally {
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  }
});
