import { useAuth } from '../../../lib/auth'
import { BookOpen, MessageSquare, Target, TrendingUp, CheckCircle2, AlertCircle, Star, Camera } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../ui/Avatar'
import PhotoUploadModal from '../../ui/PhotoUploadModal'
import { api } from '../../../lib/api'

// ─── Catalog (same as Treinamentos.tsx) – used only for labels/icons ─────────
const CATALOG: Record<number, { titulo: string; icone: string }> = {
  1: { titulo: 'LGPD e Proteção de Dados',        icone: '🔒' },
  2: { titulo: 'Cultura de Segurança no Trabalho', icone: '⛑️' },
  3: { titulo: 'Excelência no Atendimento',        icone: '🤝' },
  4: { titulo: 'Liderança Situacional',            icone: '🧭' },
  5: { titulo: 'Excel Avançado para Gestores',     icone: '📊' },
  6: { titulo: 'Comunicação Não-Violenta',         icone: '💬' },
  7: { titulo: 'Normas de Segurança NR-12',        icone: '⚙️' },
  8: { titulo: 'Gestão de Tempo e Produtividade',  icone: '⏱️' },
}
const MODULOS_TOTAL: Record<number, number> = { 1:5, 2:4, 3:5, 4:6, 5:5, 6:5, 7:3, 8:5 }

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

interface PdiItem { status: string; pct: number }
interface ProgItem { curso_id: number; modulo_id: number; concluido: boolean }

export default function MinhaVisao() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mood, setMood] = useState<string | null>(null)
  const [photoModal, setPhotoModal] = useState(false)
  const firstName = user?.name?.split(' ')[0] ?? 'Colaborador'

  const [pdiItems, setPdiItems] = useState<PdiItem[]>([])
  const [progItems, setProgItems] = useState<ProgItem[]>([])

  useEffect(() => {
    api.pdi.list().then((d: unknown) => setPdiItems((d as PdiItem[]) || [])).catch(() => {})
    api.treinamentoProgresso.list().then((d: unknown) => setProgItems((d as ProgItem[]) || [])).catch(() => {})
  }, [])

  // PDI stats
  const pdiConcluidos = pdiItems.filter(i => i.status === 'concluido').length
  const pdiAtrasados  = pdiItems.filter(i => i.status === 'atrasado').length
  const pdiTotal      = pdiItems.length
  const pdiPct        = pdiTotal === 0 ? 0 : Math.round(pdiItems.reduce((a, i) => a + i.pct, 0) / pdiTotal)

  // Treinamentos stats — aggregate by curso_id
  const cursosMap: Record<number, { feitos: number; total: number }> = {}
  for (const r of progItems) {
    if (!cursosMap[r.curso_id]) cursosMap[r.curso_id] = { feitos: 0, total: MODULOS_TOTAL[r.curso_id] ?? 1 }
    if (r.concluido) cursosMap[r.curso_id].feitos++
  }
  // Include courses that appear in catalog but have no rows yet
  for (const id of Object.keys(CATALOG).map(Number)) {
    if (!cursosMap[id]) cursosMap[id] = { feitos: 0, total: MODULOS_TOTAL[id] ?? 1 }
  }
  const cursoEntries = Object.entries(cursosMap).map(([id, { feitos, total }]) => ({
    id: Number(id), pct: Math.round((feitos / total) * 100),
  }))
  const treinosEmAndamento = cursoEntries.filter(c => c.pct > 0 && c.pct < 100)

  return (
    <>
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
              { label: 'Meus treinamentos', icon: BookOpen,     to: '/intranet/treinamentos' },
              { label: 'Comunicados',       icon: AlertCircle,  to: '/intranet/comunicados'  },
              { label: 'Meu PDI',           icon: TrendingUp,   to: '/intranet/pdi'          },
              { label: 'Minha Equipe',      icon: MessageSquare,to: '/intranet/equipe'       },
            ].map(({ label, icon: Icon, to }) => (
              <button key={label} onClick={() => navigate(to)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left">
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
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={28} className="text-slate-200 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhuma pendência no momento</p>
            <p className="text-xs text-slate-400">As pendências de pesquisas e treinamentos aparecerão aqui.</p>
          </div>
        </SectionCard>

        {/* Treinamentos em andamento */}
        <SectionCard
          title="Meus Treinamentos"
          action={<span className="text-xs text-primary-500 cursor-pointer hover:underline">Ver todos</span>}
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {treinosEmAndamento.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-slate-400">
                Nenhum treinamento em andamento. Acesse a aba Treinamentos para começar!
              </div>
            ) : treinosEmAndamento.slice(0, 4).map(c => {
              const info = CATALOG[c.id]
              if (!info) return null
              return (
                <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-xl shrink-0">{info.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{info.titulo}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{c.pct}%</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0">
                    Continuar
                  </button>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      {/* ── Coluna direita ── */}
      <div className="space-y-4">
        {/* OKRs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">OKRs</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">Em breve</span>
          </div>
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <Target size={28} className="text-slate-200 dark:text-slate-600" />
            <p className="text-xs text-slate-400">Módulo de OKRs em desenvolvimento.</p>
          </div>
        </div>

        {/* PDI */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PDI</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-700" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - pdiPct / 100)}`} strokeLinecap="round" className="text-primary-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-600">{pdiPct}%</span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight">Conclusão do plano de desenvolvimento</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatCard label="Iniciativas" value={pdiTotal}     color="text-slate-700 dark:text-slate-200" />
            <StatCard label="Atrasadas"   value={pdiAtrasados} color="text-red-500" />
            <StatCard label="Concluídas"  value={pdiConcluidos} color="text-emerald-600" />
          </div>
        </div>

        {/* Conversas 1-1 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Conversas 1-1</h3>
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-center">
            <MessageSquare size={28} className="text-slate-200 dark:text-slate-600" />
            <p className="text-xs text-slate-400">Módulo de 1-1 em desenvolvimento.</p>
          </div>
        </div>
      </div>
    </div>
    {photoModal && <PhotoUploadModal onClose={() => setPhotoModal(false)} />}
    </>
  )
}
