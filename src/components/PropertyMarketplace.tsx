"use client";

import { Building2, ShieldCheck, Search, PlusCircle, Lock, Image as ImageIcon, MapPin, Bed, Bath, Car, Maximize2, CheckCircle2, Pencil, Share2, Stamp } from "lucide-react";
import { rotuloDaCondicao } from "@/lib/partnership-models";
import { PROPERTY_PAGE_SIZE } from "@/lib/marketplace-query";
import type { Property } from "@/lib/property-types";
import { optionLabel, CONDITIONS, PURPOSES } from "@/lib/property-options";
import Avatar from "./Avatar";
import PhotoViewer from "./PhotoViewer";
import DescricaoDoImovel from "./DescricaoDoImovel";
import { fotosComCapaNaFrente } from "@/lib/photo-order";
import { useCallback, useState } from "react";
import { previsaoParaTela } from "@/lib/delivery-forecast";

export default function PropertyMarketplace({ properties, propertyTotal, propertyPage, loading, currentUserId, propertyTypes,
  propertyFilterPurpose, propertyFilterType, propertyFilterSearch, setPropertyFilterPurpose, setPropertyFilterType,
  setPropertyFilterSearch, setPropertyPage, onCreate, blockedReason = null, onShare, onSchedule, onEdit }: {
  properties: Property[]; propertyTotal: number; propertyPage: number; loading: boolean; currentUserId: string | null; propertyTypes: string[];
  propertyFilterPurpose: string; propertyFilterType: string; propertyFilterSearch: string;
  setPropertyFilterPurpose: (value: string) => void; setPropertyFilterType: (value: string) => void; setPropertyFilterSearch: (value: string) => void;
  setPropertyPage: (value: number) => void; onCreate: () => void; blockedReason?: string | null; onShare: (property: Property) => void; onSchedule: (property: Property) => void;
  onEdit?: (property: Property) => void;
}) {
  // Fotos em tela cheia (14/10/2026): a foto do cartão e o selo "N fotos" abrem a galeria.
  const [galeria, setGaleria] = useState<{ fotos: string[]; indice: number; titulo: string } | null>(null);
  const fecharGaleria = useCallback(() => setGaleria(null), []);
  const mudarFoto = useCallback((indice: number) => setGaleria((atual) => (atual ? { ...atual, indice } : atual)), []);
  const abrirFotos = (prop: Property) => {
    const fotos = fotosComCapaNaFrente(prop.photos || [], prop.coverPhoto);
    if (fotos.length) setGaleria({ fotos, indice: 0, titulo: prop.title });
  };
  const formatBRL = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const area = (value: string) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return (
<div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-orange-700" />
                  Imóveis Disponíveis para Parceria
                </h2>
            <p className="text-sm text-slate-400">Todo imóvel desta vitrine aceita parceria, na condição que o captador informou em cada um: só 50/50, só 40/40/20 ou as duas.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Endereço completo visível só para o captador
              </div>
            </div>

            {/* BARRA DE FILTROS DA VITRINE MLS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Filtro por Finalidade */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "venda", label: "Venda" },
                    { id: "aluguel", label: "Aluguel" },
                    { id: "temporada", label: "Temporada" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPropertyFilterPurpose(tab.id)}
                      className={`inline-flex h-10 items-center px-3 py-2 rounded-md text-sm font-semibold transition ${
                        propertyFilterPurpose === tab.id
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "text-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filtro por Tipo de Imóvel */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    aria-label="Tipo de imóvel"
                    value={propertyFilterType}
                    onChange={(e) => setPropertyFilterType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="todos">Todos os tipos</option>
                    {propertyTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  {/* Busca Rápida */}
                  <div className="relative min-w-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={propertyFilterSearch}
                      onChange={(e) => setPropertyFilterSearch(e.target.value)}
                      maxLength={200}
                      aria-label="Buscar imóveis"
                      placeholder="Bairro, condomínio, cidade..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full sm:w-56"
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? <p role="status" className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">Carregando imóveis...</p> : properties.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-orange-700 mx-auto">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Nenhum Imóvel Encontrado</h3>
                  <p className="text-xs text-slate-400">
                    {properties.length === 0
                      ? "Nenhum imóvel disponível para os filtros selecionados. Cadastre um imóvel ou ajuste a busca."
                      : "Nenhum imóvel corresponde aos filtros selecionados. Tente alterar o tipo ou a finalidade."}
                  </p>
                </div>
                {!propertyFilterSearch && propertyFilterPurpose === "todos" && propertyFilterType === "todos" ? (
                  <button
                    type="button"
                    disabled={!!blockedReason}
                    title={blockedReason || undefined}
                    onClick={onCreate}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-3 px-6 rounded-xl transition inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Cadastrar imóvel</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPropertyFilterPurpose("todos");
                      setPropertyFilterType("todos");
                      setPropertyFilterSearch("");
                    }}
                    className="text-orange-700 hover:underline text-xs font-semibold"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {properties.map((prop) => (
                  <div
                    key={prop.id}
                    data-property-id={prop.id}
                    className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/40 transition duration-300 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Imagem principal com badges */}
                      <div className="relative h-64 w-full bg-slate-950 overflow-hidden">
                        {prop.coverPhoto || prop.photos[0] ? <button type="button" onClick={() => abrirFotos(prop)} aria-label={`Ver as fotos de ${prop.title}`} className="block h-full w-full cursor-zoom-in"><img
                          src={prop.coverPhoto || prop.photos[0]}
                          loading="lazy"
                          alt={prop.title}
                          className="w-full h-full object-cover"
                        /></button> : <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400"><ImageIcon className="h-10 w-10" /><span className="text-xs">Sem fotos cadastradas</span></div>}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                          <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1">
                            {prop.acceptsPartnership ? rotuloDaCondicao(prop.partnershipModels) : "Só na sua carteira"}
                          </span>
                          <span className="bg-slate-900/90 backdrop-blur text-white text-xs font-medium px-2.5 py-1 rounded-md border border-slate-700">
                            {prop.propertyType}
                          </span>
                          {prop.purpose && prop.purpose !== "venda" && (
                            <span className="bg-blue-600/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md uppercase">
                              {optionLabel(PURPOSES, prop.purpose) || prop.purpose}
                            </span>
                          )}
                          {prop.acceptsTrade && (
                            <span className="bg-purple-600/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                              🔄 Aceita Permuta
                            </span>
                          )}
                          {prop.condition && prop.condition !== "usado" && (
                            <span className="bg-emerald-700/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md capitalize">
                              {optionLabel(CONDITIONS, prop.condition) || prop.condition}
                              {prop.deliveryForecast ? ` · entrega ${previsaoParaTela(prop.deliveryForecast)}` : ""}
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-800 text-xs flex items-center gap-1 text-slate-300">
                          <Lock className="w-3.5 h-3.5 text-orange-700" />
                          Endereço só com o captador
                        </div>

                        {prop.photos && prop.photos.length > 0 && (
                          <button type="button" onClick={() => abrirFotos(prop)} className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 hover:border-amber-500">
                            <ImageIcon className="w-3 h-3 text-orange-700" />
                            Ver {prop.photos.length === 1 ? "a foto" : `${prop.photos.length} fotos`}
                          </button>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700 mb-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {prop.condoName ? `${prop.condoName} • ` : ""}
                              {prop.neighborhood}, {prop.city}
                            </div>
                            <h3 className="font-bold text-lg text-orange-700 leading-snug">{prop.title}</h3>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl font-black text-orange-700">{formatBRL(prop.salePrice)}</div>
                            {prop.condoFee && parseFloat(prop.condoFee) > 0 && (
                              <div className="text-xs text-orange-700">Cond: {formatBRL(prop.condoFee)}</div>
                            )}
                          </div>
                        </div>

                        <DescricaoDoImovel texto={prop.description} />

                        {/* Características */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                          <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                            <Bed className="w-3.5 h-3.5 text-orange-700" />
                            <span>{prop.bedrooms} {prop.bedrooms === 1 ? "quarto" : "quartos"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                            <Bath className="w-3.5 h-3.5 text-orange-700" />
                            <span>{prop.bathrooms} {prop.bathrooms === 1 ? "banheiro" : "banheiros"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                            <Car className="w-3.5 h-3.5 text-orange-700" />
                            <span>{prop.parkingSpots} {prop.parkingSpots === 1 ? "vaga" : "vagas"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-800/40 p-2 rounded-lg">
                            <Maximize2 className="w-3.5 h-3.5 text-orange-700" />
                            <span>{area(prop.usefulAreaM2 || prop.areaM2)} m²</span>
                          </div>
                        </div>

                        {/* Comodidades em destaque (se houver) */}
                        {prop.privateAmenities && prop.privateAmenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {prop.privateAmenities.slice(0, 3).map((am) => (
                              <span
                                key={am}
                                className="text-[10px] bg-slate-800/60 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-md"
                              >
                                {am}
                              </span>
                            ))}
                            {prop.privateAmenities.length > 3 && (
                              <span className="text-[10px] text-orange-700 font-semibold px-1 py-0.5">
                                +{prop.privateAmenities.length - 3} itens
                              </span>
                            )}
                          </div>
                        )}

                        {/* Info do Captador */}
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={prop.broker.name} url={prop.broker.avatarUrl} size={32} />
                            <div>
                              <div className="text-xs font-semibold text-white">{prop.broker.name}</div>
                              <div className="text-[10px] text-slate-400">Captador · CRECI {prop.broker.creci}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {prop.broker.verificationStatus === "aprovado" ? <><CheckCircle2 className="w-3 h-3" /> CRECI verificado</> : "CRECI em análise"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações de Co-corretagem */}
                    <div className="p-5 pt-0 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onShare(prop)}
                        type="button"
                        title="Ficha do imóvel com os seus dados de contato, para enviar ao cliente. Confira os dados antes de enviar."
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl transition shadow-md shadow-amber-500/10"
                      >
                        <Share2 className="w-4 h-4" />
                        Ficha para o cliente
                      </button>
                      {prop.broker.id !== currentUserId && prop.acceptsPartnership && prop.status === "disponivel" && prop.broker.verificationStatus === "aprovado" ? <button
                        type="button"
                        disabled={!!blockedReason}
                        title={blockedReason || undefined}
                        onClick={() => onSchedule(prop)}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition border border-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      ><Stamp className="w-4 h-4 text-emerald-400" />Agendar visita</button> : prop.broker.id === currentUserId && onEdit ? <button
                        type="button"
                        onClick={() => onEdit(prop)}
                        title="Imóvel seu: fotos, valor e condição de parceria se mudam em Imóveis › Meus imóveis."
                        className="flex items-center justify-center gap-2 rounded-xl border border-[#083858] bg-[#ffffff] px-3 py-2.5 text-xs font-bold text-[#083858] transition hover:bg-[#eef4fa]"
                      ><Pencil className="h-4 w-4" />Editar em Meus imóveis</button> : <button type="button" disabled className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-500" title={prop.broker.id === currentUserId ? "Esta é uma captação sua; escolha um imóvel de outro corretor para iniciar uma parceria." : "Este imóvel não está aceitando parcerias."}><Stamp className="h-4 w-4" />{prop.broker.id === currentUserId ? "Imóvel da sua carteira" : "Parceria indisponível"}</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {propertyTotal > PROPERTY_PAGE_SIZE && <nav aria-label="Páginas da vitrine" className="flex items-center justify-center gap-4 pt-4">
              <button type="button" disabled={loading || propertyPage <= 1} onClick={() => setPropertyPage(propertyPage - 1)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">Anterior</button>
              <span className="text-sm">Página {propertyPage} de {Math.ceil(propertyTotal / PROPERTY_PAGE_SIZE)} · {propertyTotal} imóveis</span>
              <button type="button" disabled={loading || propertyPage * PROPERTY_PAGE_SIZE >= propertyTotal} onClick={() => setPropertyPage(propertyPage + 1)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">Próxima</button>
            </nav>}
            {galeria && <PhotoViewer fotos={galeria.fotos} indice={galeria.indice} titulo={galeria.titulo} onIndice={mudarFoto} onFechar={fecharGaleria} />}
          </div>
  );
}
