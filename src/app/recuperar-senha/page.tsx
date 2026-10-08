import type { Metadata } from "next";
import PasswordRecovery from "@/components/PasswordRecovery";

export const metadata: Metadata = {
  title: "Recuperar senha | NegociaLar",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function PasswordRecoveryPage() { return <PasswordRecovery />; }
