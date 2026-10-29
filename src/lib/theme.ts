// Tema da área logada: claro (padrão) ou escuro. O "Automático" (seguia o tema do aparelho) saiu em 28/10/2026 (Sidney: "quase
// sempre vai ser claro") — quem o tinha escolhido passa a ver o claro, sem precisar fazer nada.
// A escolha é conveniência de cada navegador (localStorage); sem acesso a ele, fica o claro.
// O atributo data-tema no <html> é aplicado antes de a página aparecer (THEME_BOOT_SCRIPT no layout), sem piscar claro.

export const THEME_KEY = "negocialar-tema";
export const THEME_CHOICES = [
  { id: "claro", label: "Claro" },
  { id: "escuro", label: "Escuro" },
] as const;
export type ThemeChoice = typeof THEME_CHOICES[number]["id"];

export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem(${JSON.stringify(THEME_KEY)});document.documentElement.setAttribute("data-tema",c==="escuro"?"escuro":"claro");}catch(e){}})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "escuro" ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function applyThemeChoice(choice: ThemeChoice) {
  document.documentElement.setAttribute("data-tema", choice === "escuro" ? "escuro" : "claro");
}

export function saveThemeChoice(choice: ThemeChoice) {
  try { window.localStorage.setItem(THEME_KEY, choice); } catch { /* sem armazenamento: vale só nesta visita */ }
  applyThemeChoice(choice);
}
