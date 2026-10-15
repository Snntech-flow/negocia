"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Gráficos do Financeiro em SVG próprio: colunas finas (até 24px) com ponta arredondada, um único eixo em reais,
// grade em linha fina, legenda sempre presente, dica ao passar o mouse ou focar e tabela como alternativa.
// Cores por papel (variáveis --fin-*, definidas em globals.css para o tema claro e o escuro).

export type MonthRow = { month: string; receita: number; despesa: number; receitaRealizada: number; despesaRealizada: number };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const monthShort = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]}/${month.slice(2, 4)}`;
export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

// Largura do elemento, medida sempre que ele aparece (o gráfico some e volta: vazio, tabela, troca de período).
function useWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!element) return;
    observer.current = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.current.observe(element);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, width] as const;
}

// Topo arredondado (4px), base reta no eixo.
function columnPath(x: number, y: number, width: number, height: number) {
  if (height <= 0) return "";
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

// Escala com números redondos: 4 divisões de 1, 2, 2,5 ou 5 × 10^n.
function niceMax(maxCents: number) {
  if (maxCents <= 0) return { top: 100000, step: 25000 };
  const raw = maxCents / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw)!;
  return { top: step * 4, step };
}

// Rótulos do gráfico: o padrão é o do Financeiro do corretor; a Administração usa "Faturado × a receber" e anos
// (15/10/2026). Sem `diferenca`/`realizado`, essas colunas e linhas não aparecem.
export type ChartLabels = { titulo: string; periodo: string; a: string; b: string; diferenca: string | null; realizadoA: string | null; realizadoB: string | null; vazio: string };
const FINANCE_LABELS: ChartLabels = { titulo: "Receitas × despesas por mês", periodo: "Mês", a: "Receitas", b: "Despesas", diferenca: "Receitas − despesas",
  realizadoA: "Recebido", realizadoB: "Pago", vazio: "Sem lançamentos de {de} a {ate} para comparar." };

export function MonthlyChart({ rows, from, to, labels = FINANCE_LABELS, xLabel = monthShort }: { rows: MonthRow[]; from: string; to: string; labels?: ChartLabels; xLabel?: (key: string) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const plotHeight = 200, top = 12, axisBand = 28, left = 64, right = 8;
  const plotWidth = Math.max(0, width - left - right);
  const band = rows.length ? plotWidth / rows.length : 0;
  const barWidth = Math.max(4, Math.min(24, (band * 0.62 - 2) / 2));
  const { top: maxValue, step } = niceMax(Math.max(0, ...rows.flatMap((row) => [row.receita, row.despesa])));
  const y = (cents: number) => top + plotHeight - (cents / maxValue) * plotHeight;
  const ticks = [0, 1, 2, 3, 4].map((index) => index * step);
  const inPeriod = (month: string) => month >= from && month <= to;
  const last = rows.length - 1;
  const hovered = hover === null ? null : rows[hover];

  return <figure className="finance-viz space-y-3" aria-labelledby="finance-monthly-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <figcaption id="finance-monthly-title" className="font-bold text-white">{labels.titulo}</figcaption>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--fin-receita)" }} />{labels.a}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--fin-despesa)" }} />{labels.b}</span>
        <button type="button" aria-pressed={table} onClick={() => setTable(!table)} className="rounded-lg border border-slate-700 px-2 py-1 font-semibold text-slate-300 hover:bg-slate-800">{table ? "Ver gráfico" : "Ver tabela"}</button>
      </div>
    </div>
    {table ? <div className="overflow-x-auto"><table className="w-full text-left text-xs">
      <thead className="text-slate-400"><tr><th className="py-2 pr-3">{labels.periodo}</th><th className="py-2 pr-3 text-right">{labels.a}</th><th className="py-2 pr-3 text-right">{labels.b}</th>{labels.diferenca && <th className="py-2 pr-3 text-right">{labels.diferenca}</th>}{labels.realizadoA && <th className="py-2 pr-3 text-right">{labels.realizadoA}</th>}{labels.realizadoB && <th className="py-2 text-right">{labels.realizadoB}</th>}</tr></thead>
      <tbody className="divide-y divide-slate-800 text-slate-300 [font-variant-numeric:tabular-nums]">{rows.map((row) => <tr key={row.month} className={inPeriod(row.month) ? "" : "opacity-60"}>
        <td className="py-2 pr-3 font-semibold">{xLabel(row.month)}</td><td className="py-2 pr-3 text-right">{brl(row.receita)}</td><td className="py-2 pr-3 text-right">{brl(row.despesa)}</td>
        {labels.diferenca && <td className="py-2 pr-3 text-right font-semibold">{brl(row.receita - row.despesa)}</td>}{labels.realizadoA && <td className="py-2 pr-3 text-right">{brl(row.receitaRealizada)}</td>}{labels.realizadoB && <td className="py-2 text-right">{brl(row.despesaRealizada)}</td>}</tr>)}</tbody>
    </table></div>
    : rows.every((row) => !row.receita && !row.despesa)
      ? <p className="rounded-lg border border-dashed border-slate-700 px-3 py-8 text-center text-xs text-slate-400">{labels.vazio.replace("{de}", xLabel(rows[0]?.month ?? from)).replace("{ate}", xLabel(to))}</p>
    : <div ref={ref} className="relative" style={{ height: top + plotHeight + axisBand }} onPointerLeave={() => setHover(null)}>
      {width > 0 && <svg width={width} height={top + plotHeight + axisBand} role="img" aria-label={`${labels.titulo}; use Ver tabela para os valores`}>
        {ticks.map((tick) => <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="var(--fin-grid)" strokeWidth={1} />
          <text x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--fin-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>{brlCompact(tick)}</text>
        </g>)}
        {rows.map((row, index) => {
          const center = left + band * index + band / 2;
          const xReceita = center - barWidth - 1, xDespesa = center + 1;
          const muted = !inPeriod(row.month);
          // Só as colunas fora do período ficam claras; o nome do mês continua legível.
          return <g key={row.month}>
            <g opacity={muted ? 0.35 : 1}>
              <path d={columnPath(xReceita, y(row.receita), barWidth, top + plotHeight - y(row.receita))} fill="var(--fin-receita)" />
              <path d={columnPath(xDespesa, y(row.despesa), barWidth, top + plotHeight - y(row.despesa))} fill="var(--fin-despesa)" />
            </g>
            <text x={center} y={top + plotHeight + 18} textAnchor="middle" fontSize={11} fill="var(--fin-muted)" fontWeight={index === last ? 700 : 400}>{xLabel(row.month)}</text>
          </g>;
        })}
        {/* Faixa do mês inteira é o alvo do mouse e do teclado (maior que a coluna). */}
        {rows.map((row, index) => <rect key={`hit-${row.month}`} x={left + band * index} y={top} width={band} height={plotHeight + axisBand - 4} fill="transparent"
          tabIndex={0} aria-label={`${xLabel(row.month)}: ${labels.a.toLowerCase()} ${brl(row.receita)}, ${labels.b.toLowerCase()} ${brl(row.despesa)}${labels.diferenca ? `, saldo ${brl(row.receita - row.despesa)}` : ""}`}
          onPointerMove={() => setHover(index)} onFocus={() => setHover(index)} onBlur={() => setHover(null)} style={{ outline: "none" }} />)}
        {hover !== null && <rect x={left + band * hover} y={top} width={band} height={plotHeight} fill="var(--fin-hover)" pointerEvents="none" />}
      </svg>}
      {hovered && <div role="status" className="pointer-events-none absolute z-10 min-w-44 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs shadow-xl"
        style={{ left: Math.min(Math.max(0, left + band * hover! + band / 2 - 88), Math.max(0, width - 176)), top: 0 }}>
        <p className="mb-1.5 font-bold text-white">{xLabel(hovered.month)}</p>
        {([[labels.a, hovered.receita, "var(--fin-receita)"], [labels.b, hovered.despesa, "var(--fin-despesa)"]] as const).map(([label, value, color]) =>
          <p key={label} className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-slate-400"><span className="inline-block h-0.5 w-3" style={{ background: color }} />{label}</span><strong className="text-white">{brl(value)}</strong></p>)}
        {labels.diferenca && <p className="mt-1 flex justify-between gap-3 border-t border-slate-800 pt-1"><span className="text-slate-400">{labels.diferenca}</span><strong className="text-white">{brl(hovered.receita - hovered.despesa)}</strong></p>}
      </div>}
    </div>}
    {!table && rows.some((row) => row.receita || row.despesa) && rows.some((row) => !inPeriod(row.month)) && <p className="text-[11px] text-slate-400">O que fica fora do período escolhido aparece mais claro, só para comparar.</p>}
  </figure>;
}

// Total por categoria: uma série, uma cor, valor na ponta da barra.
export function CategoryBars({ title, items, color, empty }: { title: string; items: { category: string; label: string; cents: number }[]; color: string; empty: string }) {
  const max = Math.max(0, ...items.map((item) => item.cents));
  return <figure className="finance-viz space-y-3">
    <figcaption className="font-bold text-white">{title}</figcaption>
    {!items.length ? <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-400">{empty}</p>
      : <ul className="space-y-2.5">{items.map((item) => <li key={item.category} className="text-xs">
        <div className="mb-1 flex justify-between gap-2"><span className="text-slate-300">{item.label}</span><span className="font-semibold text-white">{brl(item.cents)}</span></div>
        <div className="h-3.5"><div className="h-full rounded-r" style={{ width: `${Math.max(1, (item.cents / max) * 100)}%`, background: color }} /></div>
      </li>)}</ul>}
  </figure>;
}
