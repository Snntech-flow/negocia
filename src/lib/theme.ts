// Tema da área logada: claro (padrão), escuro ou automático (segue o aparelho).
// A escolha é conveniência de cada navegador (localStorage); sem acesso a ele, fica o claro.
// O atributo data-tema no <html> é aplicado antes de a página aparecer (THEME_BOOT_SCRIPT no layout), sem piscar claro.

export const THEME_KEY = "negocialar-tema";
export const THEME_CHOICES = [
  { id: "claro", label: "Claro" },
  { id: "escuro", label: "Escuro" },
  { id: "automatico", label: "Automático" },
] as const;
export type ThemeChoice = typeof THEME_CHOICES[number]["id"];

const DARK_QUERY = "(prefers-color-scheme: dark)";

export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=c==="escuro"||(c==="automatico"&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);document.documentElement.setAttribute("data-tema",d?"escuro":"claro");}catch(e){}})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "escuro" || value === "automatico" ? value : "claro";
  } catch {
    return "claro";
  }
}

export function applyThemeChoice(choice: ThemeChoice) {
  const dark = choice === "escuro" || (choice === "automatico" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.setAttribute("data-tema", dark ? "escuro" : "claro");
}

export function saveThemeChoice(choice: ThemeChoice) {
  try { window.localStorage.setItem(THEME_KEY, choice); } catch { /* sem armazenamento: vale só nesta visita */ }
  applyThemeChoice(choice);
}

// No automático, acompanha o aparelho trocar de claro para escuro com a página aberta.
export function watchSystemTheme() {
  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => { if (readThemeChoice() === "automatico") applyThemeChoice("automatico"); };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
