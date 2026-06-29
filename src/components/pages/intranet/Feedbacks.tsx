import { useState, useEffect } from 'react'
import { MessageSquare, RefreshCw, Filter, X, TrendingUp, Users } from 'lucide-react'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { useNavigate } from 'react-router-dom'

const MOODS = [
  { emoji: '😡', label: 'Zangado',    value: 'zangado',    bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-600 dark:text-red-400',         border: 'border-red-200 dark:border-red-800'    },
  { emoji: '😔', label: 'Triste',     value: 'triste',     bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-600 dark:text-orange-400',   border: 'border-orange-200 dark:border-orange-800' },
  { emoji: '😐', label: 'Neutro',     value: 'neutro',     bg: 'bg-slate-50 dark:bg-slate-700',        text: 'text-slate-600 dark:text-slate-300',     border: 'border-slate-200 dark:border-slate-600' },
  { emoji: '😊', label: 'Satisfeito', value: 'satisfeito', bg: 'bg-green-50 dark:bg-green-900/20',     text: 'text-green-600 dark:text-green-400',     border: 'border-green-200 dark:border-green-800' },
  { emoji: '😄', label: 'Alegre',     value: 'alegre',     bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
]

function getMood(value: string) {
  return MOODS.find(m => m.value === value) ?? { emoji: '❓', label: value, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' }
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function isAdminRole(role?: string) {
  if (!role) return false
  return ['Administrador de RH', 'Administrador Master', 'Administrador de RH / Gestor'].includes(role)
}

interface FeedbackItem {
  id: number
  user_id: number
  user_name: string | null
  humor: string
  comentario: string | null
  created_at: string
}

export default function FeedbacksPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filterHumor, setFilterHumor] = useState('')

  // Redireciona se não for admin
  useEffect(() => {
    if (user && !isAdminRole(user.role)) {
      navigate('/intranet', { replace: true })
    }
  }, [user, navigate])

  function fetchFeedbacks() {
    setLoading(true); setError(false)
    api.humorFeedback.list({ humor: filterHumor || undefined, limit: 100 })
      .then(data => { setItems(data.items); setTotal(data.total) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFeedbacks() }, [filterHumor])

  // Contagens por humor
  const counts = MOODS.map(m => ({
    ...m,
    count: items.filter(i => i.humor === m.value).length,
  }))

  if (!user || !isAdminRole(user.role)) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Feedbacks de Humor</h1>
          <p className="text-sm text-slate-400 mt-0.5">Respostas dos colaboradores sobre como estão se sentindo</p>
        </div>
        <button
          onClick={fetchFeedbacks}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {counts.map(m => (
          <button
            key={m.value}
            onClick={() => setFilterHumor(f => f === m.value ? '' : m.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              filterHumor === m.value
                ? `${m.bg} ${m.border}`
                : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
            }`}
          >
            <span className="text-3xl">{m.emoji}</span>
            <div className="text-center">
              <p className={`text-xl font-black ${filterHumor === m.value ? m.text : 'text-slate-800 dark:text-slate-100'}`}>{m.count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtro ativo */}
      {filterHumor && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filtrando por:</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-medium">
            {getMood(filterHumor).emoji} {getMood(filterHumor).label}
            <button onClick={() => setFilterHumor('')}><X size={12} /></button>
          </span>
          <span className="text-xs text-slate-400">{items.length} resultado{items.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Totalizador */}
      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><Users size={14} /> {total} resposta{total !== 1 ? 's' : ''} no total</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <MessageSquare size={32} className="opacity-40" />
          <p className="text-sm">Erro ao carregar feedbacks.</p>
          <button onClick={fetchFeedbacks} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
          <MessageSquare size={32} className="opacity-40" />
          <p className="text-sm">Nenhum feedback registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const m = getMood(item.humor)
            return (
              <div key={item.id} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4`}>
                {/* Emoji */}
                <div className={`w-11 h-11 rounded-xl ${m.bg} flex items-center justify-center shrink-0 text-2xl`}>
                  {m.emoji}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {item.user_name ?? 'Colaborador'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${m.bg} ${m.text} ${m.border} font-medium`}>
                        {m.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatDateTime(item.created_at)}</span>
                  </div>
                  {item.comentario ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      "{item.comentario}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1 italic">Sem comentário adicional</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
