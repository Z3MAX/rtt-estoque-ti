import { useAuth } from '../../../lib/auth'
import { BookOpen, MessageSquare, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Star, Camera } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../../ui/Avatar'
import PhotoUploadModal from '../../ui/PhotoUploadModal'

const MOODS = [
  { emoji: '😡', label: 'Zangado',   value: 'zangado',   color: 'hover:bg-red-100 dark:hover:bg-red-900/20'    },
  { emoji: '😔', label: 'Triste',    value: 'triste',    color: 'hover:bg-orange-100 dark:hover:bg-orange-900/20' },
  { emoji: '😐', label: 'Neutro',    value: 'neutro',    color: 'hover:bg-slate-100 dark:hover:bg-slate-700'    },
  { emoji: '😊', label: 'Satisfeito',value: 'satisfeito',color: 'hover:bg-green-100 dark:hover:bg-green-900/20' },
  { emoji: '😄', label: 'Alegre',    value: 'alegre',    color: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/20' },
]

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-black ${color ?? 'text-slate-800 dark:text-slate-100'}`}>{value}</p>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function MinhaVisao() {
  const { user } = useAuth()
  const [mood, setMood] = useState<string | null>(null)

  const [photoModal, setPhotoModal] = useState(false)
  const firstName = user?.name?.split(' ')[0] ?? 'Colaborador'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-5">

      {/* ── Coluna esquerda: perfil ── */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <Avatar name={user?.name ?? ''} photoUrl={user?.photo_url} size="lg" />
            <button
              onClick={() => setPhotoModal(true)}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-colors"
              title="Alterar foto"
            >
              <Camera size={13} />
            </button>
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 italic">"People first, People always"</p>
          </div>
          <div className="w-full space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            {user?.area && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Target size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">{user.area}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Star size={13} className="shrink-0 text-slate-400" />
              <span>{user?.role}</span>
            </div>
            {user?.email && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MessageSquare size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Links rápidos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Acesso rápido</p>
          <div className="space-y-1">
            {[
              { label: 'Meus treinamentos', icon: BookOpen },
              { label: 'Comunicados',       icon: AlertCircle },
              { label: 'Meu PDI',           icon: TrendingUp },
              { label: 'Conversas 1-1',     icon: MessageSquare },
            ].map(({ label, icon: Icon }) => (
              <button key={label} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left">
                <Icon size={15} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Coluna central ── */}
      <div className="space-y-5">
        {/* Humor */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Como você está se sentindo hoje, {firstName}?
          </p>
          <div className="flex gap-3 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  mood === m.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : `border-transparent ${m.color}`
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{m.label}</span>
              </button>
            ))}
          </div>
          {mood && (
            <p className="text-xs text-slate-400 mt-3">
              Resposta registrada. Obrigado pelo feedback! 🙌
            </p>
          )}
        </div>

        {/* Pendências */}
        <SectionCard title="Pendências">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {[
              { label: 'Avaliação de Competências 2025', date: '24/07/2026', type: 'avaliacao' },
              { label: 'Pesquisa de Pulso — Trimestral',  date: '04/07/2026', type: 'pesquisa'  },
              { label: 'Conclusão do treinamento de LGPD',date: '30/06/2026', type: 'treinamento'},
            ].map(({ label, date, type }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  type === 'avaliacao'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                  type === 'pesquisa'   ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'   :
                                          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                }`}>
                  {type === 'avaliacao'   ? <CheckCircle2 size={15} /> :
                   type === 'pesquisa'    ? <AlertCircle size={15} />  :
                                            <BookOpen size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{label}</p>
                  {date && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={11} className="text-slate-300" />
                      <span className="text-xs text-slate-400">{date}</span>
                    </div>
                  )}
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shrink-0">
                  Ver
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-xs text-slate-400 italic">
              As pendências reais serão integradas em breve.
            </p>
          </div>
        </SectionCard>

        {/* Treinamentos em andamento */}
        <SectionCard
          title="Meus Treinamentos"
          action={<span className="text-xs text-primary-500 cursor-pointer hover:underline">Ver todos</span>}
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {[
              { label: 'LGPD e Proteção de Dados',         pct: 60, color: 'bg-blue-500'    },
              { label: 'Cultura de Segurança no Trabalho',  pct: 30, color: 'bg-amber-500'   },
              { label: 'Excelência no Atendimento',         pct: 85, color: 'bg-emerald-500' },
            ].map(({ label, pct, color }) => (
              <div key={label} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{label}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{pct}%</span>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0">
                  Continuar
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Coluna direita ── */}
      <div className="space-y-4">
        {/* OKRs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">OKRs</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">2026 · Anual</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatCard label="Pendentes"  value={3}  color="text-amber-600" />
            <StatCard label="Atrasados"  value={1}  color="text-red-500"   />
            <StatCard label="Concluídos" value={2}  color="text-emerald-600" />
          </div>
          <button className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Ver meus OKRs
          </button>
        </div>

        {/* PDI */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PDI</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-700" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - 0.11)}`} strokeLinecap="round" className="text-primary-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-600">11%</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">Conclusão do plano de desenvolvimento</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatCard label="Iniciativas" value={16} color="text-slate-700 dark:text-slate-200" />
            <StatCard label="Atrasadas"   value={1}  color="text-red-500" />
            <StatCard label="Concluídas"  value={7}  color="text-emerald-600" />
          </div>
        </div>

        {/* Conversas 1-1 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Conversas 1-1</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-base shrink-0">0</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Conversas 1-1 aguardando</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatCard label="Agendadas" value={0} />
            <StatCard label="Realizadas" value={6} color="text-emerald-600" />
            <StatCard label="Em espera"  value={5} color="text-amber-600" />
          </div>
        </div>
      </div>
    </div>

    {photoModal && <PhotoUploadModal onClose={() => setPhotoModal(false)} />}
  )
}
