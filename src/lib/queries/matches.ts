// Carrega os matches do corretor para o botão "Match" (regra em lib/meus-matches). Mesmo alcance da Vitrine e do Radar:
// só quem tem o CRECI aprovado e a assinatura em dia vê a rede — sem isso, nenhum match (e o painel diz por quê).
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, properties, users, buyerProfiles, seenMatches } from "../db";
import { networkProfileScope, networkPropertyScope } from "../property-access";
import { hasSubscriptionAccess } from "../subscription";
import { normalizedSql, normalizeText } from "../text-match";
import { signPhotos } from "../photo-sign";
import { chaveDoMatch, montarMeusMatches, type ImovelDoMatch, type MeuMatch } from "../meus-matches";

type UsuarioDoMatch = { id: string; verificationStatus: string; subscriptionStatus: string; nextBillingDate: Date | null };

const colunasDoImovel = {
  id: properties.id, title: properties.title, propertyType: properties.propertyType, city: properties.city,
  neighborhood: properties.neighborhood, salePrice: properties.salePrice, bedrooms: properties.bedrooms,
  parkingSpots: properties.parkingSpots, purpose: properties.purpose, acceptsPartnership: properties.acceptsPartnership,
  status: properties.status, coverPhoto: properties.coverPhoto, photos: properties.photos, createdAt: properties.createdAt,
  broker: { id: users.id, name: users.name, verificationStatus: users.verificationStatus },
};

// A procura de OUTRO corretor nunca traz o nome do cliente nem as observações: só os critérios e o corretor.
const colunasDaProcura = (doCorretor: boolean) => ({
  id: buyerProfiles.id,
  clientInternalName: doCorretor ? buyerProfiles.clientInternalName : sql<string>`'Cliente parceiro'`,
  propertyType: buyerProfiles.propertyType, city: buyerProfiles.city, neighborhoods: buyerProfiles.neighborhoods,
  maxBudget: buyerProfiles.maxBudget, minBedrooms: buyerProfiles.minBedrooms, minParkingSpots: buyerProfiles.minParkingSpots,
  createdAt: buyerProfiles.createdAt,
  broker: { id: users.id, name: users.name },
});

const cidades = (lista: { city: string }[]) => [...new Set(lista.map((item) => normalizeText(item.city)))];

export async function carregarMeusMatches(usuario: UsuarioDoMatch, { comFotos = true } = {}): Promise<{ podeVerARede: boolean; matches: MeuMatch[] }> {
  const podeVerARede = usuario.verificationStatus === "aprovado" && hasSubscriptionAccess(usuario.subscriptionStatus, usuario.nextBillingDate);
  if (!podeVerARede) return { podeVerARede, matches: [] };

  const [meusPerfis, meusImoveis] = await Promise.all([
    db.select(colunasDaProcura(true)).from(buyerProfiles).innerJoin(users, eq(buyerProfiles.brokerId, users.id))
      .where(and(eq(buyerProfiles.brokerId, usuario.id), eq(buyerProfiles.active, true))),
    db.select(colunasDoImovel).from(properties).innerJoin(users, eq(properties.brokerId, users.id))
      .where(and(eq(properties.brokerId, usuario.id), networkPropertyScope(), eq(properties.purpose, "venda"))),
  ]);
  if (!meusPerfis.length && !meusImoveis.length) return { podeVerARede, matches: [] };

  const [imoveisDaRede, perfisDaRede, vistos] = await Promise.all([
    meusPerfis.length ? db.select(colunasDoImovel).from(properties).innerJoin(users, eq(properties.brokerId, users.id))
      .where(and(networkPropertyScope(), ne(properties.brokerId, usuario.id), eq(properties.purpose, "venda"),
        inArray(normalizedSql(properties.city), cidades(meusPerfis)))) : [],
    meusImoveis.length ? db.select(colunasDaProcura(false)).from(buyerProfiles).innerJoin(users, eq(buyerProfiles.brokerId, users.id))
      .where(and(networkProfileScope(), ne(buyerProfiles.brokerId, usuario.id), inArray(normalizedSql(buyerProfiles.city), cidades(meusImoveis)))) : [],
    db.select({ perfilId: seenMatches.buyerProfileId, imovelId: seenMatches.propertyId }).from(seenMatches).where(eq(seenMatches.userId, usuario.id)),
  ]);

  const comFoto = (lista: typeof meusImoveis): ImovelDoMatch[] => lista.map(({ coverPhoto, photos, ...imovel }) => ({
    ...imovel, foto: coverPhoto || photos[0] || null,
  }));
  const matches = montarMeusMatches({
    meuId: usuario.id, meusPerfis, perfisDaRede, imoveisDaRede: comFoto(imoveisDaRede), meusImoveis: comFoto(meusImoveis),
    vistos: new Set(vistos.map((visto) => chaveDoMatch(visto.perfilId, visto.imovelId))),
  });
  if (!comFotos) return { podeVerARede, matches: matches.map((match) => ({ ...match, imovel: { ...match.imovel, foto: null } })) };

  // Fotos do bucket privado: assinadas numa chamada só; a que falhar fica de fora (o cartão mostra sem foto).
  const assinadas = await signPhotos(matches.map((match) => match.imovel.foto));
  return { podeVerARede, matches: matches.map((match) => ({ ...match, imovel: { ...match.imovel, foto: match.imovel.foto ? assinadas.get(match.imovel.foto.trim()) ?? null : null } })) };
}
