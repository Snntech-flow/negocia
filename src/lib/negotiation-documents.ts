export const documentGroups: Record<string, string[]> = {
  comprador: ['RG ou CNH e CPF', 'Certidão de estado civil atualizada', 'Comprovante de residência', 'Comprovantes de renda (se houver financiamento)', 'Declaração de Imposto de Renda (se solicitada)', 'Documentos do FGTS (se for utilizar)'],
  vendedor: ['RG ou CNH e CPF', 'Certidão de estado civil atualizada', 'Pacto antenupcial (se houver)', 'Comprovante de residência', 'Certidões pessoais exigidas na operação', 'Saldo devedor para quitação (se houver financiamento)'],
  imovel: ['Matrícula atualizada', 'Certidão de ônus e restrições', 'IPTU e certidão de débitos municipais', 'Declaração de quitação do condomínio (se houver)', 'Habite-se e averbação da construção (se aplicável)'],
};
export const costLabels = ['ITBI / ITIV', 'Avaliação bancária', 'Certidões', 'Registro', 'Escritura', 'Outros custos'];
export type NegotiationDocuments = { customGroups?: Record<string, string[]>; costNames?: string[]; propertyId: string | null; propertyTitle: string; city: string; financing: boolean; fgts: boolean; statuses: Record<string, string>; costs: number[] };
export function validateNegotiationDocuments(value: NegotiationDocuments) {
  if (!value || typeof value !== 'object' || typeof value.propertyTitle !== 'string' || value.propertyTitle.length > 250 || typeof value.city !== 'string' || value.city.length > 150 || typeof value.financing !== 'boolean' || typeof value.fgts !== 'boolean') throw new Error('Dados de documentação inválidos.');
  if (value.propertyId !== null && (typeof value.propertyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.propertyId))) throw new Error('Imóvel inválido.');
  if (value.customGroups && (Object.keys(value.customGroups).sort().join(',') !== 'comprador,imovel,vendedor' || Object.values(value.customGroups).some(rows => !Array.isArray(rows) || rows.length > 40 || rows.some(label => typeof label !== 'string' || !label.trim() || label.length > 200)))) throw new Error('Revise a lista de documentos: até 40 itens por grupo, com descrição de até 200 caracteres.');
  if (value.costNames && (!Array.isArray(value.costNames) || value.costNames.length !== 6 || value.costNames.some(label => typeof label !== 'string' || !label.trim() || label.length > 100))) throw new Error('Informe os nomes dos custos.');
  const keys = Object.entries(value.customGroups || documentGroups).flatMap(([group, rows]) => rows.map((_, i) => `${group}-${i}`));
  if (!value.statuses || Array.isArray(value.statuses) || Object.entries(value.statuses).some(([key, status]) => !keys.includes(key) || !['pendente', 'solicitado', 'recebido', 'conferido', 'nao_aplica'].includes(status))) throw new Error('Situação de documento inválida.');
  if (!Array.isArray(value.costs) || value.costs.length !== costLabels.length || value.costs.some(cost => typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0 || cost > 1e9)) throw new Error('Informe custos válidos.');
  return value;
}
export function clientDocumentList(data: NegotiationDocuments, audience: 'comprador' | 'vendedor') {
  return (data.customGroups?.[audience] || documentGroups[audience]).filter((label, i) => {
    if (data.statuses[`${audience}-${i}`] === 'nao_aplica') return false;
    if (audience === 'comprador' && !data.financing && [documentGroups.comprador[3], documentGroups.comprador[4]].includes(label)) return false;
    if (audience === 'comprador' && !data.fgts && label === documentGroups.comprador[5]) return false;
    return true;
  });
}
