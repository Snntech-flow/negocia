"use client";

import { useCallback, useEffect, useRef } from "react";

// Janela aberta (ficha, fotos, assinatura, lead…): a seta de VOLTAR do navegador e o Esc fecham a janela, em vez de sair
// do aplicativo (corretora piloto, 15/10/2026: "tenho que marcar com a setinha lá de cima e acabo saindo do aplicativo e
// tendo que logar de novo"). Cada janela aberta ganha a SUA entrada no histórico (marcada com um número crescente) e
// entra numa pilha: voltar fecha a de cima (a entrada dela sai), o Esc só vale para a de cima. A função devolvida é a
// que os botões de fechar usam — ela também passa pelo histórico, para não sobrar entrada.
export const MARCA_JANELA = "negocialarJanela";

const pilha: number[] = [];
let ultimoId = 0;

/** Há uma confirmação aberta por cima (DialogHost)? Ela cuida do próprio Esc. */
const confirmacaoAberta = () => typeof document !== "undefined" && !!document.querySelector("[data-dialog-host]");

/** Voltar até uma entrada com marca menor que a desta janela (ou sem marca) quer dizer que ela saiu do histórico. */
export const janelaSaiuDoHistorico = (marcaAtual: unknown, idDaJanela: number) => Number(marcaAtual ?? 0) < idDaJanela;

export function useVoltarFecha(fechar: () => void, ativa = true) {
  const fecharRef = useRef(fechar);
  useEffect(() => { fecharRef.current = fechar; });
  const idRef = useRef(0);
  const fecharPeloApp = useCallback(() => {
    if (idRef.current && window.history.state?.[MARCA_JANELA] === idRef.current) window.history.back();
    else fecharRef.current();
  }, []);
  useEffect(() => {
    if (!ativa) return;
    const id = ++ultimoId;
    idRef.current = id;
    pilha.push(id);
    window.history.pushState({ ...(window.history.state ?? {}), [MARCA_JANELA]: id }, "");
    const aoVoltar = (event: PopStateEvent) => { if (janelaSaiuDoHistorico(event.state?.[MARCA_JANELA], id)) fecharRef.current(); };
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pilha[pilha.length - 1] === id && !confirmacaoAberta()) fecharPeloApp();
    };
    window.addEventListener("popstate", aoVoltar);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("popstate", aoVoltar);
      window.removeEventListener("keydown", aoTeclar);
      const i = pilha.indexOf(id);
      if (i >= 0) pilha.splice(i, 1);
      idRef.current = 0;
    };
  }, [ativa, fecharPeloApp]);
  return fecharPeloApp;
}
