import { Users, Search, X, Mail, Building2, Briefcase, User, Calendar, Award, UserCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import type { Colaborador } from '../../../lib/types'
import { useAuth } from '../../../lib/auth'
import { RefreshCw } from 'lucide-react'
import { NIVEL_LABELS } from '../../../lib/types'

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function initials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcAge(dateStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

function tempoNaEmpresa(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 1) return 'menos de 1 mês'
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years} ano${years > 1 ? 's' : ''}` : `${years} ano${years > 1 ? 's' : ''} e ${rem} mês${rem > 1 ? 'es' : ''}`
}

// ── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ colab, onClose }: { colab: Colaborador; onClose: () => void }) {
  const color = avatarColor(colab.nome)
  const age = calcAge(colab.data_nascimento)
  const nascimento = formatDate(colab.data_nascimento)
  const nivel = colab.nivel ? NIVEL_LABELS[colab.nivel] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header com fundo colorido */}
        <div className={`${color} px-6 pt-8 pb-16 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar sobreposto */}
        <div className="px-6 -mt-12 relative">
          {colab.photo_url ? (
            <img
              src={colab.photo_url}
              alt={colab.nome}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-lg"
            />
          ) : (
            <div className={`w-24 h-24 rounded-2xl ${color} text-white flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg`}>
              {initials(colab.nome)}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="px-6 pt-3 pb-6 space-y-5">
          {/* Nome e cargo */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{colab.nome}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {colab.cargo && (
                <span className="text-sm text-slate-500 dark:text-slate-400">{colab.cargo}</span>
              )}
              {nivel && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium">{nivel}</span>
                </>
              )}
            </div>
          </div>

          {/* Mini-CV grid */}
          <div className="space-y-3">
            {colab.area && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Building2 size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Área</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{colab.area}</p>
                </div>
              </div>
            )}

            {colab.gestor_nome && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <UserCheck size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Gestor</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{colab.gestor_nome}</p>
                </div>
              </div>
            )}

            {colab.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">E-mail</p>
                  <a
                    href={`mailto:${colab.email}`}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline truncate block"
                  >
                    {colab.email}
                  </a>
                </div>
              </div>
            )}

            {colab.data_nascimento && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Calendar size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Data de nascimento</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">
                    {nascimento}{age !== null ? ` · ${age} anos` : ''}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <Briefcase size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Tempo na empresa</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium">{tempoNaEmpresa(colab.created_at)}</p>
              </div>
            </div>

            {(colab.total_avaliacoes ?? 0) > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Award size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Avaliações concluídas</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{colab.total_avaliacoes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ações */}
          {colab.email && (
            <a
              href={`mailto:${colab.email}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            >
              <Mail size={14} /> Enviar e-mail
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EquipePage() {
  const { user } = useAuth()
  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterCargo, setFilterCargo] = useState('')
  const [selected, setSelected] = useState<Colaborador | null>(null)

  function fetchColabs() {
    setLoading(true)
    setError(false)
    api.colaboradores.list()
      .then(all => setColabs(all as Colaborador[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchColabs()
  }, [])

  // Close modal on Escape
  useEffect(() => {
    if (!selected) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected])

  const areas = [...new Set(colabs.map(c => c.area).filter(Boolean))] as string[]
  const cargos = [...new Set(colabs.map(c => c.cargo).filter(Boolean))] as string[]

  const filtered = colabs.filter(c => {
    const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || (c.cargo ?? '').toLowerCase().includes(search.toLowerCase())
    const matchArea = !filterArea || c.area === filterArea
    const matchCargo = !filterCargo || c.cargo === filterCargo
    return matchSearch && matchArea && matchCargo
  })

  const selectCls = 'py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <>
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Minha Equipe</h1>
        <p className="text-sm text-slate-400 mt-0.5">Colaboradores{user?.area ? ` da área ${user.area}` : ''}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
        </div>

        {areas.length > 0 && (
          <select className={selectCls} value={filterArea} onChange={e => setFilterArea(e.target.value)}>
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {cargos.length > 0 && (
          <select className={selectCls} value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
            <option value="">Todos os cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <Users size={32} className="opacity-40" />
          <p className="text-sm">Erro ao carregar colaboradores. Tente novamente.</p>
          <button
            onClick={fetchColabs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-3 text-center hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 hover:-translate-y-0.5 transition-all cursor-pointer text-left"
            >
              {c.photo_url ? (
                <img src={c.photo_url} alt={c.nome} className={`w-12 h-12 rounded-full object-cover`} />
              ) : (
                <div className={`w-12 h-12 rounded-full ${avatarColor(c.nome)} text-white flex items-center justify-center text-base font-bold shrink-0`}>
                  {initials(c.nome)}
                </div>
              )}
              <div className="w-full">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{c.nome}</p>
                {c.cargo && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.cargo}</p>}
                {c.area && <p className="text-[11px] text-slate-300 dark:text-slate-500 mt-0.5 line-clamp-1">{c.area}</p>}
              </div>
              <span className="text-[11px] text-primary-500 font-medium">Ver perfil →</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Users size={32} className="opacity-40" />
              <p className="text-sm">Nenhum colaborador encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>

    {selected && <ProfileModal colab={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
