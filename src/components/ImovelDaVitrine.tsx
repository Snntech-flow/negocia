"use client";

// A página do imóvel na Vitrine (/vitrine/<id>, 14/11/2026 — Sidney: "pode deixar o que temos já, mas quando clicar na
// foto abrisse em outra página"). O cartão segue igual; a foto leva para cá, onde está tudo do imóvel: todas as fotos,
// valores, características, a descrição inteira, os itens, a parceria e o captador — e as mesmas ações do cartão.
// O que é só do dono (endereço, proprietário) já vem NULL do servidor para quem não é dono (getVitrineProperty).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, MapPin, Pencil, Share2, Stamp, CheckCircle2 } from "lucide-react";
import { useI18n } from "./I18nProvider";
import FichaFotos from "./FichaFotos";
import Avatar from "./Avatar";
import WhiteLabelSheet from "./WhiteLabelSheet";
import { rotuloDaCondicao } from "@/lib/partnership-models";
import { optionLabel, CONDITIONS, PURPOSES, DOCUMENTATION_STATUSES, IPTU_PERIODS } from "@/lib/property-options";
import { fotosComCapaNaFrente } from "@/lib/photo-order";
import { previsaoParaTela } from "@/lib/delivery-forecast";
import type { Property } from "@/lib/property-types";
import type { SharingBroker } from "@/lib/white-label";

export default function ImovelDaVitrine({ property: prop, broker, currentUserId, blockedReason }: {
  property: Property; broker: SharingBroker; currentUserId: string; blockedReason: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [ficha, setFicha] = useState(false);
  const formatBRL = (value: string) => Number(value).toLocaleString(locale, { style: "currency", currency: "BRL" });
  const area = (value: string) => Number(value).toLocaleString(locale, { maximumFractionDigits: 2 });
  const fotos = fotosComCapaNaFrente(prop.photos || [], prop.coverPhoto);
  const meu = prop.broker.id === currentUserId;
  const podeAgendar = !meu && prop.acceptsPartnership && prop.status === "disponivel" && prop.broker.verificationStatus === "aprovado";
  // Voltar mantém a Vitrine onde estava (filtros e rolagem) quando veio dela; aberta direto (link, nova aba), vai à Vitrine.
  const voltar = () => { if (window.history.length > 1) router.back(); else router.push("/vitrine"); };

  const linha = (rotulo: string, valor: React.ReactNode) => valor === null || valor === undefined || valor === "" ? null
    : <div className="flex items-baseline justify-between gap-3 border-b border-slate-800/80 py-2 text-sm"><span className="text-slate-400">{rotulo}</span><span className="text-right font-semibold text-white">{valor}</span></div>;

  return (
    <div className="space-y-5">
      <button type="button" onClick={voltar} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />{t("Voltar à Vitrine")}</button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {fotos.length ? <FichaFotos fotos={fotos} titulo={prop.title} /> : <div className="flex h-56 items-center justify-center text-sm text-slate-400">{t("Sem fotos cadastradas")}</div>}
          </div>

          {prop.description?.trim() && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-2 text-sm font-bold text-white">{t("Descrição")}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{prop.description}</p>
          </section>}

          {(prop.privateAmenities?.length || prop.condoAmenities?.length) ? <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            {[["Itens privativos", prop.privateAmenities], ["Itens do condomínio", prop.condoAmenities]].map(([rotulo, itens]) => (itens as string[] | undefined)?.length ? <div key={rotulo as string}>
              <h2 className="mb-2 text-sm font-bold text-white">{t(rotulo as string)}</h2>
              <div className="flex flex-wrap gap-1.5">{(itens as string[]).map((item) => <span key={item} className="rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">{t(item)}</span>)}</div>
            </div> : null)}
          </section> : null}
        </div>

        <div className="space-y-5">
          <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-black text-slate-950">{prop.acceptsPartnership ? t(rotuloDaCondicao(prop.partnershipModels)) : t("Fora da rede")}</span>
              <span className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">{t(prop.propertyType)}</span>
              {prop.condition && prop.condition !== "usado" && <span className="rounded-md bg-emerald-700/90 px-2 py-1 text-xs font-bold text-white">
                {t(optionLabel(CONDITIONS, prop.condition)) || prop.condition}{prop.deliveryForecast ? t(" · entrega {0}", [previsaoParaTela(prop.deliveryForecast)]) : ""}</span>}
              {prop.acceptsTrade && <span className="rounded-md bg-purple-600/90 px-2 py-1 text-xs font-bold text-white">{t("🔄 Aceita Permuta")}</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700"><MapPin className="h-3.5 w-3.5" />{prop.condoName ? `${prop.condoName} • ` : ""}{prop.neighborhood}, {prop.city}</div>
            <h1 className="text-xl font-bold leading-snug text-orange-700">{prop.title}</h1>
            <div className="text-2xl font-black text-orange-700">{formatBRL(prop.salePrice)}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Lock className="h-3.5 w-3.5 text-orange-700" />{t("Endereço só com o captador")}</div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3">
            {linha(t("Finalidade"), prop.purpose ? t(optionLabel(PURPOSES, prop.purpose)) || prop.purpose : null)}
            {linha(t("Condomínio (R$/mês)"), prop.condoFee && parseFloat(prop.condoFee) > 0 ? formatBRL(prop.condoFee) : null)}
            {linha(t("IPTU (R$)"), prop.iptu && parseFloat(prop.iptu) > 0 ? `${formatBRL(prop.iptu)}${prop.iptuPeriod ? ` · ${t(optionLabel(IPTU_PERIODS, prop.iptuPeriod)) || prop.iptuPeriod}` : ""}` : null)}
            {linha(t("Quartos"), prop.bedrooms)}
            {linha(t("Suítes"), prop.suites || null)}
            {linha(t("Banheiros"), prop.bathrooms)}
            {linha(t("Vagas"), prop.parkingSpots)}
            {linha(t("Área útil (m²)"), prop.usefulAreaM2 && parseFloat(prop.usefulAreaM2) > 0 ? area(prop.usefulAreaM2) : prop.areaM2 && parseFloat(prop.areaM2) > 0 ? area(prop.areaM2) : null)}
            {linha(t("Área total (m²)"), prop.totalAreaM2 && parseFloat(prop.totalAreaM2) > 0 ? area(prop.totalAreaM2) : null)}
            {linha(t("Aceita financiamento"), prop.acceptsFinancing === undefined || prop.acceptsFinancing === null ? null : prop.acceptsFinancing ? t("Sim, financia") : t("Somente à vista"))}
            {linha(t("Documentação"), prop.documentationStatus ? t(optionLabel(DOCUMENTATION_STATUSES, prop.documentationStatus)) || prop.documentationStatus : null)}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2.5">
              <Avatar name={prop.broker.name} url={prop.broker.avatarUrl} size={36} />
              <div>
                <div className="text-sm font-semibold text-white">{prop.broker.name}</div>
                <div className="text-xs text-slate-400">{t("Captador · CRECI")}{" "}{prop.broker.creci}</div>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              {prop.broker.verificationStatus === "aprovado" ? <><CheckCircle2 className="h-3 w-3" /> {t("CRECI verificado")}</> : "CRECI em análise"}
            </span>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setFicha(true)} title={t("Ficha do imóvel com os seus dados de contato, para enviar ao cliente. Confira os dados antes de enviar.")}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/10 transition hover:from-amber-400 hover:to-amber-500">
              <Share2 className="h-4 w-4" />{t("Ficha para o cliente")}</button>
            {podeAgendar ? <button type="button" disabled={!!blockedReason} title={t(blockedReason) || undefined} onClick={() => router.push(`/dvp?imovel=${prop.id}`)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Stamp className="h-4 w-4 text-emerald-400" />{t("Agendar visita")}</button>
              : meu ? <button type="button" onClick={() => router.push(`/meus-imoveis?imovel=${prop.id}`)} title={t("Imóvel seu: fotos, valor e condição de parceria se mudam em Imóveis › Meus imóveis.")}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#131315] bg-[#ffffff] px-3 py-2.5 text-xs font-bold text-[#131315] transition hover:bg-[#f3f3f5]">
                <Pencil className="h-4 w-4" />{t("Editar em Meus imóveis")}</button>
              : <button type="button" disabled title={t("Este imóvel não está aceitando parcerias.")}
                className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-500">
                <Stamp className="h-4 w-4" />{t("Parceria indisponível")}</button>}
          </div>
        </div>
      </div>

      {ficha && <WhiteLabelSheet key={prop.id} property={prop} broker={broker} onClose={() => setFicha(false)} />}
    </div>
  );
}
