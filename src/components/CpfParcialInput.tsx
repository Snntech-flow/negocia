"use client";

import { useState } from "react";
import { cpfParcial } from "@/lib/cpf-parcial";

const NAO_ENTENDIDO = "Digite o CPF do cliente (inteiro ou só os 6 números do meio).";

// CPF do cliente no registro de visita: a pessoa digita como tiver e a tela mostra como vai ficar ("***.058.124-**").
// O formulário recebe, num campo escondido com o mesmo nome, só a forma mascarada — o CPF inteiro não sai do navegador.
export default function CpfParcialInput({ id, name, className, inicial = "" }: { id: string; name: string; className?: string; inicial?: string }) {
  const [texto, setTexto] = useState(inicial);
  const mascarado = cpfParcial(texto);
  const invalido = texto.trim() !== "" && !mascarado;
  return <>
    <input id={id} type="text" inputMode="numeric" autoComplete="off" required value={texto} placeholder="Ex.: 016.058.124-15"
      aria-describedby={`${id}-cpf`} className={className}
      onChange={(event) => { setTexto(event.target.value); event.target.setCustomValidity(event.target.value.trim() && !cpfParcial(event.target.value) ? NAO_ENTENDIDO : ""); }} />
    <input type="hidden" name={name} value={mascarado ?? ""} />
    <span id={`${id}-cpf`} className={`mt-1 block text-[11px] ${invalido ? "font-semibold text-red-700" : "text-slate-500"}`}>
      {invalido ? NAO_ENTENDIDO : mascarado ? `Vai no registro assim: ${mascarado} (o CPF inteiro não é guardado)` : "Pode digitar o CPF inteiro: o registro guarda só os 6 números do meio."}
    </span>
  </>;
}
