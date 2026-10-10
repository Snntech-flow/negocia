// Foto do corretor quando ele tem uma; senão, as iniciais. Nunca uma foto de outra pessoa.
export default function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toLocaleUpperCase("pt-BR")).join("") || "?";
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  if (url && url.startsWith("https://")) {
    return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover border border-slate-700" />;
  }
  return <span role="img" aria-label={name} style={style} className="shrink-0 inline-flex items-center justify-center rounded-full bg-amber-100 font-bold text-amber-900 border border-amber-300">{initials}</span>;
}
