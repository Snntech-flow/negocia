// Obrigatórios do cadastro de imóvel que a tela confere antes de publicar: como a mensagem chama cada um e o campo
// (id no formulário) para onde a tela rola. "Condição do imóvel" vai por extenso: com a condição de parceria no mesmo
// formulário, "condição" sozinha confundia (corretora piloto, 14/10/2026). O servidor confere de novo ao gravar.
export type Obrigatorios = {
  propertyType: string | null; condition: string | null; bedrooms: number | null; suites: number | null;
  bathrooms: number | null; parkingSpots: number | null; acceptsFinancing: boolean | null;
  usefulAreaM2: string; totalAreaM2: string; state: string;
};

export function camposQueFaltam(v: Obrigatorios): { rotulo: string; campo: string }[] {
  const checagem: [boolean, string, string][] = [
    [!v.propertyType, "tipo do imóvel", "pc-tipo"],
    [!v.condition, "condição do imóvel (novo, usado, em construção ou na planta)", "pc-condicao"],
    [v.bedrooms === null, "quartos", "pc-quartos"],
    [v.suites === null, "suítes", "pc-suites"],
    [v.bathrooms === null, "banheiros", "pc-banheiros"],
    [v.parkingSpots === null, "vagas", "pc-vagas"],
    [v.acceptsFinancing === null, "se aceita financiamento", "pc-financiamento"],
    [!v.usefulAreaM2 && !v.totalAreaM2, "área (útil ou total)", "pc-useful"],
    [!v.state, "UF", "pc-state"],
  ];
  return checagem.filter(([falta]) => falta).map(([, rotulo, campo]) => ({ rotulo, campo }));
}
