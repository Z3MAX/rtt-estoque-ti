import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, CheckCircle2, Clock, TrendingUp, RefreshCw, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../../lib/api'
import type { DashboardAvaliacoes, CicloAvaliacao } from '../../lib/types'
import { useTheme } from '../../lib/theme'

const QUADRANTE_COLORS: Record<string, string> = {
  E3: '#10b981', E2: '#34d399', E1: '#3b82f6',
  M3: '#06b6d4', M2: '#94a3b8', M1: '#f59e0b',
  B3: '#6366f1', B2: '#fb923c', B1: '#ef4444',
}

const QUADRANTE_LABELS: Record<string, string> = {
  E3: 'Talento Top / Estrela', E2: 'Potencial Forte',    E1: 'Enigma',
  M3: 'Forte Desempenho',     M2: 'Mantenedor / Eficaz', M1: 'Questionável',
  B3: 'Dedicado / Especialista', B2: 'Bom Profissional', B1: 'Risco / Subpadrão',
}

const PERIODO_LABELS: Record<string, string> = {
  '2Sem_2025': '2º Sem 2025', '1Sem_2026': '1º Sem 2026',
  '2Sem_2026': '2º Sem 2026', '1Sem_2025': '1º Sem 2025',
}

function QuadranteBadge({ q }: { q?: string }) {
  if (!q) return <span className="text-slate-400 text-xs">—</span>
  const color = QUADRANTE_COLORS[q] || '#94a3b8'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: color }}>
      {q}
    </span>
  )
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function KpiCard({ label, value, sub, icon: Icon, colorClass }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; colorClass: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardAvaliacoes | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.dashboard() as DashboardAvaliacoes
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0'
  const textColor = theme === 'dark' ? '#94a3b8' : '#64748b'

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  const taxaAvaliacao = data && data.total_colaboradores > 0
    ? Math.round((data.colaboradores_avaliados / data.total_colaboradores) * 100)
    : 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Visão geral dos ciclos de avaliação</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs gap-1.5">
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Colaboradores" value={data?.total_colaboradores ?? 0} icon={Users} colorClass="bg-primary-500" sub="ativos na base" />
        <KpiCard label="Avaliações concluídas" value={data?.avaliacoes_concluidas ?? 0} icon={CheckCircle2} colorClass="bg-emerald-500" sub={`de ${data?.total_avaliacoes ?? 0} registradas`} />
        <KpiCard label="Colaboradores avaliados" value={data?.colaboradores_avaliados ?? 0} icon={TrendingUp} colorClass="bg-blue-500" sub={`${taxaAvaliacao}% da base`} />
        <KpiCard label="Sem avaliação" value={(data?.total_colaboradores ?? 0) - (data?.colaboradores_avaliados ?? 0)} icon={Clock} colorClass="bg-amber-500" sub="aguardam ciclo" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Distribuição por quadrante */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Distribuição por Quadrante 9-Box</h2>
          {data?.distribuicao_quadrantes && data.distribuicao_quadrantes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.distribuicao_quadrantes} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="quadrante" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: 8, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, _: any, entry: any) => [v, entry?.payload?.label || ''] as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => QUADRANTE_LABELS[l] || String(l)}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.distribuicao_quadrantes.map((entry) => (
                    <Cell key={entry.quadrante} fill={QUADRANTE_COLORS[entry.quadrante] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">Nenhuma avaliação concluída</div>
          )}
        </div>

        {/* Avaliações por período */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Avaliações por Semestre</h2>
          {data?.avaliacoes_por_periodo && data.avaliacoes_por_periodo.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.avaliacoes_por_periodo} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="periodo" tickFormatter={(v: string) => PERIODO_LABELS[v] || v} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: theme === 'dark' ? '#1e293b' : '#fff', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v: unknown) => PERIODO_LABELS[v as string] || String(v)}
                />
                <Bar dataKey="count" fill="#e30613" radius={[6, 6, 0, 0]} maxBarSize={48} name="Avaliações" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">Nenhum dado disponível</div>
          )}
        </div>
      </div>

      {/* Recent */}
      {data?.avaliacoes_recentes && data.avaliacoes_recentes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Avaliações Recentes</h2>
            <Link to="/colaboradores" className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.avaliacoes_recentes.map((a: CicloAvaliacao) => (
              <Link key={a.id} to={`/colaboradores/${a.colaborador_id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <span className="text-primary-600 dark:text-primary-400 text-xs font-bold">
                    {(a.colaborador_nome || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{a.colaborador_nome}</p>
                  <p className="text-xs text-slate-400">
                    {a.periodo_inicial && a.periodo_final ? `${PERIODO_LABELS[a.periodo_inicial] || a.periodo_inicial} → ${PERIODO_LABELS[a.periodo_final] || a.periodo_final}` : '—'}
                    {a.avaliador_nome ? ` · ${a.avaliador_nome}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <QuadranteBadge q={a.quadrante} />
                  <span className="text-xs text-slate-400 hidden sm:block">{formatDate(a.created_at)}</span>
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
