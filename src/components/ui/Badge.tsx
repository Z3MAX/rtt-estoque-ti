export type QuadranteKey = 'E3'|'E2'|'E1'|'M3'|'M2'|'M1'|'B3'|'B2'|'B1'

const quadranteConfig: Record<QuadranteKey, { label: string; className: string }> = {
  E3: { label: 'Talento Top',        className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  E2: { label: 'Potencial Forte',    className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  E1: { label: 'Enigma',             className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  M3: { label: 'Forte Desempenho',   className: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' },
  M2: { label: 'Mantenedor',         className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  M1: { label: 'Questionável',       className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  B3: { label: 'Especialista',       className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  B2: { label: 'Bom Profissional',   className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  B1: { label: 'Risco',              className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}

interface QuadranteBadgeProps { quadrante: string; className?: string }

export function QuadranteBadge({ quadrante, className = '' }: QuadranteBadgeProps) {
  const cfg = quadranteConfig[quadrante as QuadranteKey]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className} ${className}`}>
      {quadrante} · {cfg.label}
    </span>
  )
}

export { quadranteConfig }
