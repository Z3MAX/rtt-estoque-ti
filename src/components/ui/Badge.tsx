import type { EquipmentStatus } from '../../lib/types'

const statusConfig: Record<EquipmentStatus, { label: string; className: string }> = {
  disponivel: { label: 'Disponível', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  em_uso: { label: 'Em Uso', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  manutencao: { label: 'Manutenção', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  inativo: { label: 'Inativo', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
}

interface StatusBadgeProps {
  status: EquipmentStatus
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? statusConfig.inativo
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {cfg.label}
    </span>
  )
}

export { statusConfig }
