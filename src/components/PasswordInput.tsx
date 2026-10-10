"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { wrapperClassName?: string };

// Campo de senha com o olho para conferir o que foi digitado antes de enviar.
// Visível, o campo vira texto: sem maiúscula automática nem corretor, senão o celular muda a senha.
export function PasswordInput({ className = "", wrapperClassName = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Esconder a senha" : "Mostrar a senha";
  return (
    <span className={`relative block ${wrapperClassName}`}>
      <input {...props} type={visible ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${className} pr-11`} />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={label} aria-pressed={visible} title={label} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </span>
  );
}
