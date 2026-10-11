// Filtros do Funil/Clientes lembrados NESTE aparelho, por corretor (vídeo da corretora piloto, 11/10/2026: ela escolheu
// "Qualificado / Comprador / Indicação" achando que gravava algo e perguntou onde salvar — são filtros da lista; agora a
// tela diz isso e a escolha volta quando ela volta). Conveniência de tela: se o navegador não deixar guardar, segue sem.

export type FiltrosDoFunil = { month: string; stage: string; type: string; source: string; state: string; city: string; followUp: string };

export function filtrosPadrao(estadoDoCorretor: string | null | undefined): FiltrosDoFunil {
  return { month: "", stage: "todos", type: "todos", source: "todos", state: estadoDoCorretor || "", city: "todas", followUp: "todos" };
}

export function chaveDosFiltros(userId: string | null | undefined): string | null {
  return userId ? `negocialar:funil-filtros:${userId}` : null;
}

/** O que estava guardado, campo a campo: só texto curto; o resto (lixo, versão antiga) volta ao padrão. */
export function lerFiltros(guardado: string | null | undefined, padrao: FiltrosDoFunil): FiltrosDoFunil {
  if (!guardado) return padrao;
  let obj: unknown;
  try { obj = JSON.parse(guardado); } catch { return padrao; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return padrao;
  const lido = { ...padrao };
  for (const chave of Object.keys(padrao) as (keyof FiltrosDoFunil)[]) {
    const v = (obj as Record<string, unknown>)[chave];
    if (typeof v === "string" && v.length <= 120) lido[chave] = v;
  }
  if (lido.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(lido.month)) lido.month = "";
  return lido;
}

export function filtrosAtivos(f: FiltrosDoFunil): boolean {
  return !!f.month || f.stage !== "todos" || f.type !== "todos" || f.source !== "todos" || f.city !== "todas" || f.followUp !== "todos";
}
