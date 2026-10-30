import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Preto da marca (29/10/2026: logo nova preta e dourada; antes, o azul-marinho da logo antiga).
        slate: { 800: "#1f1f22", 900: "#18181a", 950: "#131315" },
        black: "#131315",
        brand: {
          50: "#effbf7",
          100: "#d6f5eb",
          200: "#b1ebd9",
          300: "#7ddbc2",
          400: "#44c2a5",
          500: "#22a689", // Tom de confiança, conexão imobiliária e negócios
          600: "#18856f",
          700: "#176a5a",
          800: "#16554a",
          900: "#16463e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
