// Os matches DO CORRETOR para o botão "Match" do cabeçalho (Sidney, 28/10/2026: "toda vez que tivesse um match ele ficava
// vermelho, e dentro dele os matches; quando entrasse aparecia 'você já tem 8 matches', pro corretor ver que funciona").
// Os critérios são os do Radar (evaluateRadarMatch). Diferente do Radar, que mostra a rede toda, aqui só entram os pares que
// envolvem o corretor:
//   · "meu_cliente": a procura é dele e o imóvel é de outro corretor;
//   · "meu_imovel": o imóvel é dele e a procura é de outro corretor — o nome desse cliente nunca aparece, só o corretor.
// O número é sempre o real: zero é zero.
import { evaluateRadarMatch, type RadarProfile, type RadarProperty } from "./radar-matching";

export type ImovelDoMatch = RadarProperty & { foto: string | null; createdAt: Date | string };
export type PerfilDoMatch = RadarProfile & { createdAt: Date | string };

export type MeuMatch = {
  chave: string;
  lado: "meu_cliente" | "meu_imovel";
  perfilId: string;
  imovelId: string;
  /** O nome do cliente do corretor, ou "Cliente de <corretor>" quando a procura é de outro corretor. */
  cliente: string;
  /** Captador do imóvel ("meu_cliente") ou corretor do cliente ("meu_imovel"). */
  outroCorretor: string;
  imovel: { title: string; neighborhood: string; city: string; salePrice: string; foto: string | null };
  novo: boolean;
  /** O mais recente entre a procura e o imóvel (ISO), para os mais novos virem primeiro. */
  desde: string;
};

export const chaveDoMatch = (perfilId: string, imovelId: string) => `${perfilId}:${imovelId}`;

const iso = (data: Date | string) => (data instanceof Date ? data : new Date(data)).toISOString();

export function montarMeusMatches({ meuId, meusPerfis, imoveisDaRede, meusImoveis, perfisDaRede, vistos }: {
  meuId: string;
  meusPerfis: PerfilDoMatch[];
  imoveisDaRede: ImovelDoMatch[];
  meusImoveis: ImovelDoMatch[];
  perfisDaRede: PerfilDoMatch[];
  /** Chaves (procura:imóvel) que o corretor já viu. */
  vistos: ReadonlySet<string>;
}): MeuMatch[] {
  const pares = new Map<string, MeuMatch>();
  const juntar = (perfil: PerfilDoMatch, imovel: ImovelDoMatch, lado: MeuMatch["lado"]) => {
    const meu = lado === "meu_cliente" ? perfil.broker.id === meuId && imovel.broker.id !== meuId : imovel.broker.id === meuId && perfil.broker.id !== meuId;
    if (!meu || !evaluateRadarMatch(imovel, perfil).matched) return;
    const chave = chaveDoMatch(perfil.id, imovel.id);
    if (pares.has(chave)) return;
    const desdeDoPerfil = iso(perfil.createdAt);
    const desdeDoImovel = iso(imovel.createdAt);
    pares.set(chave, {
      chave, lado, perfilId: perfil.id, imovelId: imovel.id,
      cliente: lado === "meu_cliente" ? perfil.clientInternalName : `Cliente de ${perfil.broker.name}`,
      outroCorretor: lado === "meu_cliente" ? imovel.broker.name : perfil.broker.name,
      imovel: { title: imovel.title, neighborhood: imovel.neighborhood, city: imovel.city, salePrice: imovel.salePrice, foto: imovel.foto },
      novo: !vistos.has(chave),
      desde: desdeDoPerfil > desdeDoImovel ? desdeDoPerfil : desdeDoImovel,
    });
  };
  for (const perfil of meusPerfis) for (const imovel of imoveisDaRede) juntar(perfil, imovel, "meu_cliente");
  for (const imovel of meusImoveis) for (const perfil of perfisDaRede) juntar(perfil, imovel, "meu_imovel");
  return [...pares.values()].sort((a, b) => Number(b.novo) - Number(a.novo) || b.desde.localeCompare(a.desde));
}

/** "Você já tem 8 matches" · "Você já tem 1 match" · "Você ainda não tem match". */
export function frasePrincipalDoMatch(total: number) {
  if (total <= 0) return "Você ainda não tem match";
  return `Você já tem ${total} ${total === 1 ? "match" : "matches"}`;
}
