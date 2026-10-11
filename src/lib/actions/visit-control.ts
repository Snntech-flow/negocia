"use server";

// Controle de visita a imóvel (11/10/2026): os dados que o corretor imprime para o cliente assinar no papel. Só quem
// registrou a visita (o corretor do comprador) imprime, e só imóvel à venda. O endereço protegido do imóvel não é lido:
// quem imprime nunca é o dono do imóvel — sai bairro, cidade e o código.

import { and, eq } from "drizzle-orm";
import { ActionError, runAction } from "../action-result";
import { db, dvpCertificates, properties, users } from "../db";
import { requireCurrentUser } from "../auth";
import type { DadosDoControle } from "../visit-control";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const codigo = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();
// O dia da visita em Brasília (o servidor roda em UTC: à noite a data viraria o dia seguinte).
const diaDeBrasilia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

async function getVisitControlImpl(dvpId: string): Promise<DadosDoControle> {
  const actor = await requireCurrentUser();
  if (typeof dvpId !== "string" || !UUID.test(dvpId)) throw new ActionError("Registro de visita não encontrado.");
  const [r] = await db.select({
    numero: dvpCertificates.certificateHash, clienteNome: dvpCertificates.clientName, clienteTelefone: dvpCertificates.clientPhone,
    visita: dvpCertificates.visitDate,
    corretorNome: users.name, corretorCreci: users.creci, corretorUf: users.state,
    imovelId: properties.id, titulo: properties.title, tipo: properties.propertyType, bairro: properties.neighborhood,
    cidade: properties.city, valor: properties.salePrice, finalidade: properties.purpose,
  }).from(dvpCertificates)
    .innerJoin(properties, eq(properties.id, dvpCertificates.propertyId))
    .innerJoin(users, eq(users.id, dvpCertificates.partnerBrokerId))
    .where(and(eq(dvpCertificates.id, dvpId), eq(dvpCertificates.partnerBrokerId, actor.id)))
    .limit(1);
  if (!r) throw new ActionError("Registro de visita não encontrado entre as visitas que você registrou.");
  if (r.finalidade !== "venda") throw new ActionError("O controle de visita é para imóvel à venda: a declaração é do comprador, com percentual sobre o valor do bem.");
  return {
    numero: r.numero,
    corretor: { nome: r.corretorNome, creci: r.corretorCreci, uf: r.corretorUf || null },
    imovel: { codigo: codigo(r.imovelId), tipo: r.tipo, titulo: r.titulo, bairro: r.bairro, cidade: r.cidade, valor: r.valor },
    cliente: { nome: r.clienteNome, telefone: r.clienteTelefone },
    dataDaVisita: diaDeBrasilia(r.visita),
  };
}

export async function getVisitControl(...args: Parameters<typeof getVisitControlImpl>) { return runAction(() => getVisitControlImpl(...args)); }
