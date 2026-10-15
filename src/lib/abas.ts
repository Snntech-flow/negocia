// Abas abertas da área logada, como no Flow (pedido do Sidney, 15/10/2026): cada tela aberta pelo menu vira uma aba
// com X; a Vitrine é a aba fixa (início, sem X). Fechar a aba ativa leva para a última aba que sobrou.

export function abrirAba<T>(abertas: readonly T[], aba: T): T[] {
  return abertas.includes(aba) ? [...abertas] : [...abertas, aba];
}

export function fecharAba<T>(abertas: readonly T[], aba: T, ativa: T, fixa: T): { abertas: T[]; ativa: T } {
  if (aba === fixa || !abertas.includes(aba)) return { abertas: [...abertas], ativa };
  const restantes = abertas.filter((item) => item !== aba);
  if (!restantes.includes(fixa)) restantes.unshift(fixa);
  return { abertas: restantes, ativa: aba === ativa ? restantes[restantes.length - 1] : ativa };
}

/** Abas guardadas (sessionStorage) → só as permitidas, sem repetir, com a fixa na frente. */
export function abasGuardadas<T extends string>(guardado: unknown, permitidas: readonly T[], fixa: T): T[] {
  const lista = Array.isArray(guardado) ? guardado.filter((item): item is T => typeof item === "string" && permitidas.includes(item as T)) : [];
  return [fixa, ...lista.filter((item, i) => item !== fixa && lista.indexOf(item) === i)];
}
