// Next.js troca a mensagem de erro lançado por uma ação por um texto técnico em produção.
// Por isso as ações devolvem o erro esperado como valor, e a tela relança com unwrap().

// Mensagem pensada para o usuário; qualquer outro erro vira a mensagem genérica.
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
// Tipo do dado de uma ação: ActionData<Awaited<ReturnType<typeof minhaAcao>>>.
export type ActionData<R> = R extends { ok: true; data: infer D } ? D : never;

export const GENERIC_ACTION_ERROR = "Não foi possível concluir agora. Tente de novo em instantes; se continuar, avise em Ajuda / Fale conosco.";

function pgCode(error: unknown): string | undefined {
  const candidate = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = candidate?.code ?? candidate?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

// O Drizzle embrulha o erro do Postgres; o código fica em error.cause.
export function isUniqueViolation(error: unknown) {
  return pgCode(error) === "23505";
}

export async function runAction<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    // Só a primeira linha: a mensagem do Drizzle traz os parâmetros da consulta (dados pessoais).
    const message = error instanceof Error ? error.message.split("\n")[0].slice(0, 200) : "erro desconhecido";
    console.error("Falha inesperada em ação do servidor:", { name: (error as Error)?.name, code: pgCode(error), message });
    return { ok: false, error: GENERIC_ACTION_ERROR };
  }
}

export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
