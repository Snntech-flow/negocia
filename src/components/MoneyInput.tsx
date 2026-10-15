"use client";

import { useState } from "react";
import { campoDeReais, formatarReais, lerReais, reaisParaServidor } from "@/lib/money-input";

const NAO_ENTENDIDO = "Valor não entendido — use só números, ex.: 720000 ou 720.000,00.";

// Campo de dinheiro no formato brasileiro: aceita "720.000", "720.000,00" ou "720000", mostra embaixo como ficou e manda
// ao formulário, num campo escondido com o mesmo nome, o valor no formato do servidor ("720000.00").
export default function MoneyInput({ id, name, defaultValue, required, placeholder, className }: {
  id: string; name: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; className?: string;
}) {
  const [texto, setTexto] = useState(() => campoDeReais(defaultValue));
  const valor = lerReais(texto);
  const invalido = texto.trim() !== "" && valor === null;
  const previa = valor !== null && texto !== formatarReais(valor) ? `R$ ${formatarReais(valor)}` : "";
  return <>
    <input id={id} type="text" inputMode="decimal" autoComplete="off" required={required} value={texto} placeholder={placeholder}
      aria-describedby={`${id}-reais`} className={className}
      onChange={(event) => {
        setTexto(event.target.value);
        event.target.setCustomValidity(event.target.value.trim() && lerReais(event.target.value) === null ? NAO_ENTENDIDO : "");
      }}
      onBlur={() => { if (valor !== null) setTexto(formatarReais(valor)); }} />
    <input type="hidden" name={name} value={valor === null ? "" : reaisParaServidor(valor)} />
    <span id={`${id}-reais`} className={`mt-0.5 block text-[11px] ${invalido ? "font-semibold text-red-700" : "text-slate-500"}`}>{invalido ? NAO_ENTENDIDO : previa}</span>
  </>;
}
