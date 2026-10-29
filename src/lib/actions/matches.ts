import { db, seenMatches } from "../db";
import { ActionError } from "../action-result";
import { requireCurrentUser } from "../auth";
import { carregarMeusMatches } from "../queries/matches";

// Botão "Match" (28/10/2026): a lista que abre no painel e o "já vi" que zera o vermelho.
export async function getMyMatchesImpl() {
  const actor = await requireCurrentUser();
  return carregarMeusMatches(actor);
}

const CHAVE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Marca como vistos os matches que o painel mostrou. Só entra o que é match do corretor AGORA (recalculado aqui): a chave
// vinda da tela não basta.
export async function markMatchesSeenImpl(chaves: string[]) {
  if (!Array.isArray(chaves) || chaves.length > 1000 || chaves.some((chave) => typeof chave !== "string" || !CHAVE.test(chave))) {
    throw new ActionError("Matches inválidos.");
  }
  const actor = await requireCurrentUser();
  const { matches } = await carregarMeusMatches(actor, { comFotos: false });
  const doCorretor = new Map(matches.map((match) => [match.chave, match]));
  const linhas = [...new Set(chaves)].flatMap((chave) => {
    const match = doCorretor.get(chave);
    return match ? [{ userId: actor.id, buyerProfileId: match.perfilId, propertyId: match.imovelId }] : [];
  });
  if (linhas.length) await db.insert(seenMatches).values(linhas).onConflictDoNothing();
  return { marcados: linhas.length };
}
