import { Manrope } from "next/font/google";

// Fonte da página inicial. O next/font baixa no build e serve do próprio site (a CSP só aceita fonte de 'self').
export const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
