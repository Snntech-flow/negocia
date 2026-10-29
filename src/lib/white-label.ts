import { descricaoSemContato } from "./descricao-sem-contato";

type Listing = { title: string; city: string; neighborhood: string; salePrice: string; propertyType: string; bedrooms: number; bathrooms: number; parkingSpots: number; areaM2: string; coverPhoto?: string | null; photos: string[] ; description?: string | null };
export type SharingBroker = { name: string; creci: string; whatsapp: string; avatar: string };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatArea = (value: string) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;
const features = (property: Listing) => `${count(property.bedrooms, "quarto", "quartos")} · ${count(property.bathrooms, "banheiro", "banheiros")} · ${count(property.parkingSpots, "vaga", "vagas")}`;

export function whiteLabelContact(property: Listing, broker: SharingBroker) {
  let phone = broker.whatsapp.replace(/\D/g, "");
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (!/^55\d{10,11}$/.test(phone)) return null;
  const message = `Olá ${broker.name}, tenho interesse no imóvel ${property.title}, em ${property.neighborhood}, ${property.city}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function whiteLabelText(property: Listing, broker: SharingBroker) {
  const contact = whiteLabelContact(property, broker);
  return [property.title, `${property.neighborhood}, ${property.city}`, `${property.propertyType} · ${money(property.salePrice)}`,
    `${features(property)} · ${formatArea(property.areaM2)} m²`,
    // A descrição (28/10/2026), sem o contato direto do captador — a ficha é do corretor que compartilha.
    ...(descricaoSemContato(property.description) ? ["", descricaoSemContato(property.description), ""] : []),
    `Atendimento: ${broker.name} · CRECI ${broker.creci}`, ...(contact ? [contact] : [])].join("\n");
}

export function whiteLabelHtml(property: Listing, broker: SharingBroker) {
  const contact = whiteLabelContact(property, broker);
  const photo = property.coverPhoto || property.photos[0];
  let image = "";
  try {
    const url = new URL(photo || "");
    if (url.protocol === "https:" && !url.username && !url.password) image = `<img src="${escapeHtml(url.href)}" alt="${escapeHtml(property.title)}">`;
  } catch { /* The printable sheet also works without an image. */ }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(property.title)}</title>
    <style>body{font:16px system-ui,sans-serif;color:#16384e;max-width:760px;margin:32px auto;padding:24px}header{border-bottom:2px solid #d49b25;padding-bottom:16px}h1{font-size:28px}img{width:100%;max-height:360px;object-fit:cover;margin:24px 0}.price{font-size:24px;font-weight:700}a{color:#146548;overflow-wrap:anywhere}@media print{body{margin:0;padding:12mm}img{max-height:85mm}a{text-decoration:none}}</style>
    </head><body><header><strong>${escapeHtml(broker.name)}</strong><p>CRECI ${escapeHtml(broker.creci)}</p></header>${image}
    <h1>${escapeHtml(property.title)}</h1><p>${escapeHtml(property.neighborhood)}, ${escapeHtml(property.city)}</p><p class="price">${escapeHtml(money(property.salePrice))}</p>
    <p>${escapeHtml(property.propertyType)} · ${features(property)} · ${escapeHtml(formatArea(property.areaM2))} m²</p>
    ${descricaoSemContato(property.description) ? `<p style="white-space:pre-line">${escapeHtml(descricaoSemContato(property.description))}</p>` : ""}
    ${contact ? `<p>Fale com ${escapeHtml(broker.name)}: <a href="${escapeHtml(contact)}">${escapeHtml(broker.whatsapp)}</a></p>` : ""}
    <p>Disponibilidade e condições devem ser confirmadas com o corretor.</p></body></html>`;
}
