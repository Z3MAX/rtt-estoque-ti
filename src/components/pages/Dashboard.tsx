import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Monitor, TrendingUp, CheckCircle2, Wrench, XCircle,
  Activity, ArrowRight, Clock, Package,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { DashboardData } from '../../lib/types'
import { StatusBadge } from '../ui/Badge'

const iconMap: Record<string, React.ElementType> = {
  Monitor, Laptop: Monitor, Tv: Monitor, Printer: Monitor,
  Wifi: Activity, Mouse: Monitor, Server: Package, Phone: Monitor,
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-900">{value.toLocaleString('pt-BR')}</p>
        <p className="text-sm text-slate-500 font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingUp, setSettingUp] = useState(false)
  const [setupDone, setSetupDone] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      setError('')
      const d = await api.dashboard() as DashboardData
      setData(d)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('table')) {
        setError('setup_needed')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-56" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error === 'setup_needed' || (error && error.includes('DATABASE_URL'))) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[80vh]">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Configuração inicial</h2>
          <p className="text-slate-500 text-sm mb-6">
            O banco de dados precisa ser configurado. Certifique-se de que a variável
            <code className="mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 text-xs">DATABASE_URL</code>
            está definida no Netlify, depois clique em configurar.
          </p>
          {setupDone && (
            <p className="text-emerald-600 text-sm mb-4 font-medium">
              Banco configurado com sucesso!
            </p>
          )}
          <button className="btn-primary w-full justify-center" onClick={handleSetup} disabled={settingUp}>
            {settingUp ? 'Configurando...' : 'Configurar banco de dados'}
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="card p-6 border-red-100 bg-red-50">
          <p className="text-red-600 text-sm font-medium">Erro: {error}</p>
          <button className="btn-secondary mt-3 text-xs" onClick={load}>Tentar novamente</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const utilizationPct = data.total > 0 ? Math.round((data.em_uso / data.total) * 100) : 0

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Visão geral do inventário de TI</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total de Ativos" value={data.total} icon={Monitor} color="bg-primary-500" />
        <StatCard
          label="Disponíveis" value={data.disponivel} icon={CheckCircle2} color="bg-emerald-500"
          sub={data.total > 0 ? `${Math.round((data.disponivel / data.total) * 100)}% do total` : ''}
        />
        <StatCard
          label="Em Uso" value={data.em_uso} icon={TrendingUp} color="bg-blue-500"
          sub={`${utilizationPct}% utilização`}
        />
        <div className="grid grid-rows-2 gap-3">
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Wrench size={15} className="text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-none">{data.manutencao}</p>
              <p className="text-xs text-slate-500 mt-0.5">Manutenção</p>
            </div>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <XCircle size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-none">{data.inativo}</p>
              <p className="text-xs text-slate-500 mt-0.5">Inativos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Por Categoria</h3>
          {data.byCategory.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum equipamento cadastrado</p>
          ) : (
            <div className="space-y-3">
              {data.byCategory.map((cat) => {
                const pct = data.total > 0 ? (cat.count / data.total) * 100 : 0
                const Icon = iconMap[cat.icon] ?? Monitor
                return (
                  <div key={cat.name}>
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color + '20' }}
                      >
                        <Icon size={12} style={{ color: cat.color }} />
                      </div>
                      <span className="text-sm text-slate-700 flex-1">{cat.name}</span>
                      <span className="text-sm font-semibold text-slate-900">{cat.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full ml-9">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Adicionados recentemente</h3>
            <Link to="/equipamentos" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum equipamento cadastrado</p>
          ) : (
            <div className="space-y-2">
              {data.recent.map((eq) => (
                <div key={eq.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '20' }}
                  >
                    <Monitor size={13} style={{ color: eq.category_color ?? '#6366f1' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{eq.name}</p>
                    <p className="text-xs text-slate-400 truncate">{eq.brand} {eq.model}</p>
                  </div>
                  <StatusBadge status={eq.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Movements */}
      {data.recentMovements.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900">Histórico recente</h3>
          </div>
          <div className="space-y-1">
            {data.recentMovements.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{m.equipment_name}</span>
                    <span className="text-slate-400 mx-1">&mdash;</span>
                    {m.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
