// Envio de fotos de imóveis para o Supabase Storage, sempre pelo servidor do app (a chave nunca vai ao navegador).
// A tela reduz e regrava a foto em JPEG antes de enviar, o que também remove a localização da câmera.

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const DAILY_PHOTO_UPLOADS = 200;
export type PhotoType = "image/jpeg" | "image/png" | "image/webp";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

// Tipo pelo conteúdo, não pelo nome nem pelo Content-Type informado.
export function detectImageType(bytes: Uint8Array): PhotoType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  return null;
}

function containsAscii(bytes: Uint8Array, text: string) {
  const needle = ascii(text);
  outer: for (let index = 0; index <= bytes.length - needle.length; index++) {
    for (let offset = 0; offset < needle.length; offset++) if (bytes[index + offset] !== needle[offset]) continue outer;
    return true;
  }
  return false;
}

// Dados de câmera (EXIF) podem trazer o GPS do imóvel: só aceitamos fotos sem eles.
export function hasCameraMetadata(bytes: Uint8Array, type: PhotoType) {
  if (type === "image/png") return containsAscii(bytes, "eXIf");
  if (type === "image/webp") return containsAscii(bytes, "EXIF");
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break; // início da imagem comprimida: não há mais cabeçalhos
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xe1 && startsWith(bytes, [...ascii("Exif"), 0, 0], offset + 4)) return true;
    if (length < 2) break;
    offset += 2 + length;
  }
  return false;
}

export function photoStorageConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.NEGOCIAR_LAR_PHOTO_BUCKET || "imoveis";
  if (!url || !key) return null;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co") || !/^[a-z0-9-]{3,63}$/.test(bucket)) return null;
  return { origin: parsed.origin, key, bucket };
}

const EXTENSIONS: Record<PhotoType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function storePhoto(bytes: Uint8Array, type: PhotoType, userId: string, config: NonNullable<ReturnType<typeof photoStorageConfig>>, fetcher: typeof fetch = fetch) {
  const path = `${userId}/${crypto.randomUUID()}.${EXTENSIONS[type]}`;
  const response = await fetcher(`${config.origin}/storage/v1/object/${config.bucket}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, "Content-Type": type, "Cache-Control": "31536000", "x-upsert": "false" },
    body: new Blob([bytes as BlobPart], { type }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Storage respondeu ${response.status}`);
  return `${config.origin}/storage/v1/object/public/${config.bucket}/${path}`;
}
