// Assinatura de fotos de imóveis para o bucket PRIVADO do Supabase Storage.
// As fotos são confidenciais (só quem tem acesso ao imóvel): o banco guarda o CAMINHO do objeto
// (userId/uuid.jpg) e a camada de leitura troca por uma URL ASSINADA curta na hora de exibir —
// só depois das checagens de acesso que cada loader já faz. A service key nunca vai ao navegador.
// Compatível com o legado: valores que ainda são a URL pública antiga (/object/public/...) têm o
// caminho extraído e são reassinados; links externos (colados pelo corretor) passam direto.

import { photoStorageConfig } from "./photo-upload";

const SIGN_TTL_SEGUNDOS = 3600; // 1 hora
const LOTE = 100; // máx. de caminhos por chamada ao endpoint de assinatura em lote

type Config = NonNullable<ReturnType<typeof photoStorageConfig>>;

/** O CAMINHO do objeto no nosso bucket, ou null se o valor é externo/vazio (não é nosso). */
export function normalizarPath(valor: string | null | undefined, config: Config | null = photoStorageConfig()): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim();
  if (!v) return null;
  if (!config) return /^https?:\/\//i.test(v) ? null : v.replace(/^\/+/, "");
  const publico = `${config.origin}/storage/v1/object/public/${config.bucket}/`;
  if (v.startsWith(publico)) return v.slice(publico.length);
  const assinado = `${config.origin}/storage/v1/object/sign/${config.bucket}/`;
  if (v.startsWith(assinado)) return v.slice(assinado.length).split("?")[0];
  if (/^https?:\/\//i.test(v)) return null; // outra URL http(s) = link externo, não é nosso
  return v.replace(/^\/+/, ""); // já é um caminho
}

/**
 * Mapeia cada valor original → URL utilizável: assinada (os nossos) ou o próprio valor (externos).
 * Fail-soft: os nossos que falharem a assinatura ficam FORA do mapa — o chamador os descarta
 * (melhor sem a foto do que a página quebrar). Dedup por caminho; assina em lotes de 100.
 */
export async function signPhotos(
  valores: Array<string | null | undefined>,
  expiresIn = SIGN_TTL_SEGUNDOS,
  fetcher: typeof fetch = fetch,
): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  const config = photoStorageConfig();
  const valoresPorPath = new Map<string, string[]>(); // caminho nosso -> valores originais que o apontam

  for (const valor of valores) {
    if (typeof valor !== "string") continue;
    const v = valor.trim();
    if (!v || resultado.has(v)) continue;
    const path = normalizarPath(v, config);
    if (path === null) { resultado.set(v, v); continue; } // externo: passa direto
    const lista = valoresPorPath.get(path);
    if (lista) { if (!lista.includes(v)) lista.push(v); } else { valoresPorPath.set(path, [v]); }
  }

  const paths = [...valoresPorPath.keys()];
  if (!config || paths.length === 0) return resultado;

  // Lotes em PARALELO: a vitrine assina muitos imóveis por página; sequencial somaria a latência.
  const lotes: string[][] = [];
  for (let i = 0; i < paths.length; i += LOTE) lotes.push(paths.slice(i, i + LOTE));
  await Promise.all(lotes.map(async (lote) => {
    try {
      const r = await fetcher(`${config.origin}/storage/v1/object/sign/${config.bucket}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn, paths: lote }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) throw new Error(`sign ${r.status}`);
      const linhas = (await r.json()) as Array<{ path?: string | null; signedURL?: string | null }>;
      for (const linha of linhas) {
        if (!linha.path || !linha.signedURL) continue; // caminho que falhou fica de fora (fail-soft)
        const url = `${config.origin}/storage/v1${linha.signedURL}`;
        for (const original of valoresPorPath.get(linha.path) ?? []) resultado.set(original, url);
      }
    } catch (e) {
      // Sem dados no log (igual ao resto): só o tipo. O lote fica fora do mapa → descartado.
      console.error("Falha ao assinar fotos:", e instanceof Error ? e.constructor.name : typeof e);
    }
  }));
  return resultado;
}

/** Conveniência para um único valor. Retorna a URL assinada/externa, ou null se não deu. */
export async function signPhoto(valor: string | null | undefined, expiresIn = SIGN_TTL_SEGUNDOS): Promise<string | null> {
  if (typeof valor !== "string" || !valor.trim()) return null;
  return (await signPhotos([valor], expiresIn)).get(valor.trim()) ?? null;
}

type FotosDeImovel = { photos?: string[] | null; coverPhoto?: string | null; floorPlanPhotos?: string[] | null };

/**
 * Troca as fotos guardadas (caminho/URL antiga) pelas URLs assinadas, em lote para toda a lista.
 * Use SEMPRE depois das checagens de acesso do loader — assim só quem recebe o imóvel recebe a URL.
 */
export async function assinarFotosDeImoveis<T extends FotosDeImovel>(imoveis: T[]): Promise<T[]> {
  const valores: string[] = [];
  for (const im of imoveis) {
    if (Array.isArray(im.photos)) valores.push(...im.photos);
    if (im.coverPhoto) valores.push(im.coverPhoto);
    if (Array.isArray(im.floorPlanPhotos)) valores.push(...im.floorPlanPhotos);
  }
  if (valores.length === 0) return imoveis;
  const assinadas = await signPhotos(valores);
  const aplicar = (v: string | null | undefined): string | null => (typeof v === "string" && v.trim() ? assinadas.get(v.trim()) ?? null : null);
  const fotosDe = (arr: string[] | null | undefined) => (Array.isArray(arr) ? arr.map(aplicar).filter((x): x is string => x !== null) : arr);
  return imoveis.map((im) => ({
    ...im,
    photos: fotosDe(im.photos),
    coverPhoto: aplicar(im.coverPhoto),
    floorPlanPhotos: fotosDe(im.floorPlanPhotos),
  }));
}
