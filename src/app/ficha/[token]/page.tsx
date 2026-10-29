// Página PÚBLICA (sem login) da ficha do imóvel, para o corretor mandar ao cliente. Mostra só os dados white-label
// (fotos, bairro/cidade, preço, características, descrição sem contato direto) e o contato do corretor que compartilhou.
// NUNCA o endereço completo, o proprietário ou o captador. O token (listing-share) carrega o imóvel + o corretor; o estado
// é sempre o atual. 28/10/2026: as fotos abrem a galeria (antes eram imagens soltas, só 8) e a descrição entrou.
import type { Metadata } from "next";
import { inArray, eq, and } from "drizzle-orm";
import { db, properties, users } from "@/lib/db";
import { verifyListingShare } from "@/lib/listing-share";
import { signPhotos } from "@/lib/photo-sign";
import { fotosComCapaNaFrente } from "@/lib/photo-order";
import { descricaoSemContato } from "@/lib/descricao-sem-contato";
import { whiteLabelContact, formatArea, type SharingBroker } from "@/lib/white-label";
import Avatar from "@/components/Avatar";
import FichaFotos from "@/components/FichaFotos";

export const dynamic = "force-dynamic";
// Link por cliente: nunca indexar nos buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const count = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-700">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-lg font-bold text-slate-900">Negocia Lar</h1>
        <p className="text-sm">{children}</p>
      </div>
    </main>
  );
}

export default async function FichaPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dados = verifyListingShare(token);
  if (!dados) return <Aviso>Este link não é válido ou expirou. Peça ao corretor um link atualizado.</Aviso>;

  const [prop] = await db
    .select({
      title: properties.title, propertyType: properties.propertyType, salePrice: properties.salePrice,
      city: properties.city, neighborhood: properties.neighborhood, bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms, parkingSpots: properties.parkingSpots, areaM2: properties.areaM2,
      photos: properties.photos, coverPhoto: properties.coverPhoto, purpose: properties.purpose,
      description: properties.description,
    })
    .from(properties)
    .where(and(eq(properties.id, dados.propertyId), inArray(properties.status, ["disponivel", "em_negociacao"])))
    .limit(1);
  if (!prop) return <Aviso>Este imóvel não está mais disponível.</Aviso>;

  const [broker] = await db
    .select({ name: users.name, creci: users.creci, whatsapp: users.whatsapp, avatarUrl: users.avatarUrl })
    .from(users).where(eq(users.id, dados.brokerId)).limit(1);
  if (!broker) return <Aviso>Este imóvel não está mais disponível.</Aviso>;

  // Todas as fotos, capa na frente, assinadas numa chamada só (a que falhar fica de fora — melhor sem ela que a página quebrar).
  const ordem = fotosComCapaNaFrente(prop.photos || [], prop.coverPhoto);
  const assinadas = await signPhotos(ordem);
  const fotos = ordem.map((f) => assinadas.get(f.trim())).filter((u): u is string => !!u);
  const descricao = descricaoSemContato(prop.description);
  const sharingBroker: SharingBroker = { name: broker.name || "", creci: broker.creci || "", whatsapp: broker.whatsapp || "", avatar: broker.avatarUrl || "" };
  const contato = whiteLabelContact({ ...prop, coverPhoto: fotos[0] ?? null }, sharingBroker);

  return (
    <main className="min-h-screen bg-slate-50 py-6 px-4 text-slate-900">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <header className="flex items-center gap-3">
          <Avatar name={sharingBroker.name || "?"} url={sharingBroker.avatar} size={44} />
          <div>
            <p className="text-sm font-bold">{sharingBroker.name}</p>
            <p className="text-xs text-slate-500">CRECI {sharingBroker.creci}</p>
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <FichaFotos fotos={fotos} titulo={prop.title} />
          <div className="space-y-3 p-5">
            <p className="text-xs text-slate-500">{prop.neighborhood}, {prop.city}</p>
            <h1 className="text-lg font-bold leading-snug">{prop.title}</h1>
            <p className="text-2xl font-extrabold text-amber-600">{money(prop.salePrice)}</p>
            <p className="text-sm text-slate-600">{count(prop.bedrooms, "quarto", "quartos")} · {count(prop.bathrooms, "banheiro", "banheiros")} · {count(prop.parkingSpots, "vaga", "vagas")} · {formatArea(prop.areaM2)} m²</p>
            {descricao && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{descricao}</p>}
            {contato
              ? <a href={contato} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white">Falar no WhatsApp</a>
              : <p className="text-xs text-slate-500">Contato indisponível.</p>}
          </div>
        </div>

        <p className="pt-2 text-center text-[11px] text-slate-400">Ficha compartilhada por {sharingBroker.name} · Negocia Lar · O endereço completo é informado pelo corretor.</p>
      </div>
    </main>
  );
}
