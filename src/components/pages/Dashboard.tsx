import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Monitor, TrendingUp, CheckCircle2, Wrench, XCircle,
  Activity, ArrowRight, Clock, Package, DollarSign,
  MapPin, RefreshCw, Tag,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { api } from '../../lib/api'
import type { DashboardData } from '../../lib/types'
import { StatusBadge } from '../ui/Badge'
import { useTheme } from '../../lib/theme'

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const iconMap: Record<string, React.ElementType> = {
  Monitor, Laptop: Monitor, Tv: Monitor, Printer: Monitor,
  Wifi: Activity, Mouse: Monitor, Server: Package, Phone: Monitor,
}

const STATUS_COLORS: Record<string, string> = {
  disponivel: '#10b981',
  em_uso:     '#3b82f6',
  manutencao: '#f59e0b',
  inativo:    '#94a3b8',
}
const STATUS_LABELS: Record<string, string> = {
  disponivel: 'Disponível',
  em_uso:     'Em Uso',
  manutencao: 'Manutenção',
  inativo:    'Inativo',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, icon: Icon, colorClass, sub, subColor,
}: {
  label: string; value: string | number; icon: React.ElementType
  colorClass: string; sub?: string; subColor?: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{label}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-slate-400 dark:text-slate-500'}`}>{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Custom Pie tooltip ───────────────────────────────────────────────────── */
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</p>
      <p className="text-slate-500 dark:text-slate-400">{p.value} equipamentos ({p.payload.pct}%)</p>
    </div>
  )
}

/* ─── Custom Bar tooltip ───────────────────────────────────────────────────── */
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className="text-slate-500 dark:text-slate-400">{payload[0].value} adicionados</p>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [settingUp, setSettingUp] = useState(false)
  const [setupDone, setSetupDone] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => { load() }, [])

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError('')
      const d = await api.dashboard() as DashboardData
      setData(d)
      setLastUpdated(new Date())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('table')) {
        setError('setup_needed')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleSetup() {
    try {
      setSettingUp(true)
      await api.setup()
      setSetupDone(true)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSettingUp(false)
    }
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-56" />
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => <div key={i} className="h-56 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  /* ── Setup needed ── */
  if (error === 'setup_needed' || (error && error.includes('DATABASE_URL'))) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[80vh]">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Configuração inicial</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            O banco de dados precisa ser configurado. Certifique-se de que a variável
            <code className="mx-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs">DATABASE_URL</code>
            está definida no Netlify, depois clique em configurar.
          </p>
          {setupDone && <p className="text-emerald-600 text-sm mb-4 font-medium">Banco configurado com sucesso!</p>}
          <button className="btn-primary w-full justify-center" onClick={handleSetup} disabled={settingUp}>
            {settingUp ? 'Configurando...' : 'Configurar banco de dados'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Generic error ── */
  if (error) {
    return (
      <div className="p-8">
        <div className="card p-6 border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">Erro: {error}</p>
          <button className="btn-secondary mt-3 text-xs" onClick={() => load()}>Tentar novamente</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const utilizationPct = data.total > 0 ? Math.round((data.em_uso / data.total) * 100) : 0
  const availablePct   = data.total > 0 ? Math.round((data.disponivel / data.total) * 100) : 0

  /* Pie data */
  const pieData = [
    { name: STATUS_LABELS.disponivel, value: data.disponivel, key: 'disponivel' },
    { name: STATUS_LABELS.em_uso,     value: data.em_uso,     key: 'em_uso' },
    { name: STATUS_LABELS.manutencao, value: data.manutencao, key: 'manutencao' },
    { name: STATUS_LABELS.inativo,    value: data.inativo,    key: 'inativo' },
  ]
    .filter((d) => d.value > 0)
    .map((d) => ({ ...d, pct: data.total > 0 ? Math.round((d.value / data.total) * 100) : 0 }))

  const axisColor = isDark ? '#64748b' : '#94a3b8'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'

  return (
    <div className="p-8 space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Visão geral do inventário de TI
            {lastUpdated && (
              <span className="ml-2 text-slate-400 dark:text-slate-500">
                · Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-secondary"
          title="Atualizar dados"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total de Ativos"
          value={data.total.toLocaleString('pt-BR')}
          icon={Monitor}
          colorClass="bg-primary-500"
        />
        <KpiCard
          label="Disponíveis"
          value={data.disponivel}
          icon={CheckCircle2}
          colorClass="bg-emerald-500"
          sub={`${availablePct}% do total`}
          subColor="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          label="Em Uso"
          value={data.em_uso}
          icon={TrendingUp}
          colorClass="bg-blue-500"
          sub={`${utilizationPct}% utilização`}
          subColor="text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          label="Manutenção"
          value={data.manutencao}
          icon={Wrench}
          colorClass="bg-amber-500"
          sub={data.manutencao > 0 ? 'Atenção necessária' : 'Nenhum pendente'}
          subColor={data.manutencao > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}
        />
        <KpiCard
          label="Inativos"
          value={data.inativo}
          icon={XCircle}
          colorClass="bg-slate-400 dark:bg-slate-600"
        />
        <KpiCard
          label="Valor Total"
          value={data.totalValue > 0 ? formatCurrency(data.totalValue) : '—'}
          icon={DollarSign}
          colorClass="bg-violet-500"
          sub={data.valuedCount > 0 ? `${data.valuedCount} com valor` : 'Sem valores cadastrados'}
          subColor="text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Status donut */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Distribuição por status</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{data.total} equipamentos no total</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly bar chart */}
        <div className="card p-6 lg:col-span-3">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Novos equipamentos por mês</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Últimos 6 meses</p>
          {data.monthlyGrowth.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyGrowth} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: isDark ? '#1e293b' : '#f8fafc', radius: 6 }} />
                <Bar dataKey="count" fill="#e30613" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Category + Location row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* By Category */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Tag size={15} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Por categoria</h3>
          </div>
          {data.byCategory.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum equipamento cadastrado</p>
          ) : (
            <div className="space-y-3.5">
              {data.byCategory.map((cat) => {
                const pct = data.total > 0 ? (cat.count / data.total) * 100 : 0
                const Icon = iconMap[cat.icon] ?? Monitor
                return (
                  <div key={cat.name}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color + '25' }}
                      >
                        <Icon size={13} style={{ color: cat.color }} />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 font-medium">{cat.name}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cat.count}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full ml-10">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* By Location */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={15} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Por local</h3>
          </div>
          {data.byLocation.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum local com equipamentos</p>
          ) : (
            <div className="space-y-3.5">
              {data.byLocation.map((loc) => {
                const pct = data.total > 0 ? (loc.count / data.total) * 100 : 0
                return (
                  <div key={loc.name}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        <MapPin size={13} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 font-medium">{loc.name}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{loc.count}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full ml-10">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent equipment */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Adicionados recentemente</h3>
            <Link
              to="/equipamentos"
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum equipamento cadastrado</p>
          ) : (
            <div className="space-y-1">
              {data.recent.map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '20' }}
                  >
                    <Monitor size={14} style={{ color: eq.category_color ?? '#6366f1' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{eq.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {[eq.brand, eq.model].filter(Boolean).join(' ') || eq.category_name || '—'}
                    </p>
                  </div>
                  <StatusBadge status={eq.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Histórico recente</h3>
          </div>
          {data.recentMovements.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhuma movimentação registrada</p>
          ) : (
            <div className="space-y-0">
              {data.recentMovements.map((m, idx) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 py-2.5 ${idx < data.recentMovements.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/50' : ''}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{m.equipment_name}</span>
                      {m.description && (
                        <>
                          <span className="text-slate-400 mx-1">&mdash;</span>
                          <span className="text-slate-500 dark:text-slate-400">{m.description}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(m.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
