import { useState, useEffect, type FormEvent } from 'react'
import { Users, Plus, Pencil, ShieldCheck, Wrench, ToggleLeft, ToggleRight, X, Eye, EyeOff, Search, Mail, AlertTriangle, CheckCircle2, Send, Trash2, UserPlus, RefreshCw, CheckSquare, Square, MailCheck, Link2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import ConfirmDialog from '../ui/ConfirmDialog'

interface AppUser {
  id: number
  name: string
  email: string
  role: string
  roles?: string[]
  area?: string | null
  active: boolean
  must_change_password?: boolean
  colaborador_id?: number | null
  created_at: string
}

const ROLES = ['Administrador Master', 'Administrador de RH', 'Administrador de RH / Gestor', 'Gestor', 'Beta Teste']
const SECONDARY_ROLES = ['Instrutor']

const ROLE_STYLE: Record<string, string> = {
  'Administrador Master':      'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  'Administrador de RH':       'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800',
  'Administrador de RH / Gestor': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'Gestor':                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'Beta Teste':                'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  'Instrutor':                 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  // backward compat
  'Administrador de TI':       'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-cyan-500',
]
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */
interface ModalProps {
  user?: AppUser | null
  onClose: () => void
  onSaved: () => void
  currentUserRole?: string
  knownAreas?: string[]
}

function UserModal({ user, onClose, onSaved, currentUserRole, knownAreas = [] }: ModalProps) {
  const isEdit = !!user
  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState(user?.role ?? 'Gestor')
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>(
    (user?.roles ?? []).filter(r => SECONDARY_ROLES.includes(r))
  )
  const [area, setArea]         = useState(user?.area ?? '')
  const [areaCustom, setAreaCustom] = useState(false)
  const [areas, setAreas]       = useState<string[]>([])
  const [colaboradorId, setColaboradorId] = useState<number | null>(user?.colaborador_id ?? null)
  const [colaboradores, setColaboradores] = useState<{ id: number; nome: string; cargo?: string; area?: string }[]>([])
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [emailWarning, setEmailWarning] = useState<string | null>(null)

  useEffect(() => {
    // Começa com as áreas já conhecidas dos usuários existentes
    const seed = new Set(knownAreas.filter(Boolean))
    setAreas([...seed].sort())
    if (user?.area && !seed.has(user.area)) setAreaCustom(true)

    // Enriquece com áreas dos colaboradores (quando disponível)
    api.departamentos.list()
      .then((result) => {
        const depts = result as { area: string }[]
        depts.forEach(d => { if (d.area && d.area !== 'Sem área') seed.add(d.area) })
        const merged = [...seed].sort()
        setAreas(merged)
        if (user?.area && !merged.includes(user.area)) setAreaCustom(true)
        else if (user?.area && merged.includes(user.area)) setAreaCustom(false)
      })
      .catch(() => { /* mantém a lista seed */ })

    api.colaboradores.list()
      .then((result) => {
        const cols = result as { id: number; nome: string; cargo?: string; area?: string }[]
        setColaboradores(cols.sort((a, b) => a.nome.localeCompare(b.nome)))
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Nome e e-mail são obrigatórios'); return }
    if ((role === 'Gestor' || role === 'Administrador de RH / Gestor') && !area.trim()) { setError('Departamento é obrigatório para Gestores'); return }

    try {
      setLoading(true); setError(''); setEmailWarning(null)
      const allRoles = [role, ...secondaryRoles.filter(r => r !== role)]
      if (isEdit) {
        const payload: Record<string, unknown> = { name, email, role, roles: allRoles, area: area.trim() || null, colaborador_id: colaboradorId ?? null }
        if (password) payload.password = password
        await api.users.update(user!.id, payload)
        onSaved()
      } else {
        const result = await api.users.create({ name, email, role, roles: allRoles, area: area.trim() || null }) as { emailSent?: boolean; emailError?: string }
        // Se a conta foi criada mas o e-mail não foi enviado, avisa sem fechar o modal
        if (result.emailSent === false) {
          setEmailWarning(result.emailError || 'E-mail de convite não pôde ser enviado')
          onSaved() // recarrega a lista, mas não fecha o modal para mostrar o aviso
        } else {
          onSaved()
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{isEdit ? 'Atualize os dados do usuário' : 'Preencha os dados do novo usuário'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input className="input" placeholder="Ex: João Silva" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" placeholder="joao@rttshop.com.br" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          </div>
          {isEdit && (
            <div>
              <label className="label">Nova senha (deixe em branco para manter)</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="label">Perfil de acesso principal</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Funções adicionais</label>
            <div className="flex flex-col gap-2">
              {SECONDARY_ROLES.map((r) => {
                const checked = secondaryRoles.includes(r)
                return (
                  <label key={r} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                      {checked && <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={loading}
                      onChange={(e) => setSecondaryRoles(prev => e.target.checked ? [...prev, r] : prev.filter(x => x !== r))}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className="label">
              Departamento / Área
              {(role === 'Gestor' || role === 'Administrador de RH / Gestor') && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {!areaCustom && areas.length > 0 ? (
              <select
                className="input"
                value={area}
                onChange={(e) => {
                  if (e.target.value === '__outro__') { setAreaCustom(true); setArea('') }
                  else setArea(e.target.value)
                }}
                disabled={loading}
              >
                <option value="">Selecione um departamento...</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="__outro__">Outro (digitar manualmente)</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Ex: TI, Comercial, Financeiro..."
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  disabled={loading}
                  autoFocus={areaCustom}
                />
                {areaCustom && areas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setAreaCustom(false); setArea('') }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 shrink-0"
                    disabled={loading}
                  >
                    ← Lista
                  </button>
                )}
              </div>
            )}
            {(role === 'Gestor' || role === 'Administrador de RH / Gestor') && (
              <p className="text-xs text-slate-400 mt-1">O Gestor só visualizará colaboradores desta área.</p>
            )}
          </div>

          {isEdit && (
            <div>
              <label className="label">Colaborador vinculado</label>
              <select
                className="input"
                value={colaboradorId ?? ''}
                onChange={(e) => setColaboradorId(e.target.value ? Number(e.target.value) : null)}
                disabled={loading}
              >
                <option value="">— Nenhum —</option>
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome}{c.cargo ? ` · ${c.cargo}` : ''}{c.area ? ` (${c.area})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Vincula este login ao perfil do colaborador para filtrar treinamentos por cargo/área.</p>
            </div>
          )}

          {/* E-mail não enviado — aviso com motivo */}
          {emailWarning && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Conta criada, mas e-mail não enviado</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{emailWarning}</p>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 pl-5">
                Verifique as variáveis <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">SITE_URL</code>, <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">SMTP_USER</code> e <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">SMTP_PASS</code> no Netlify.
                Use o botão <strong>Reenviar convite</strong> na lista de usuários após corrigir.
              </p>
              <button type="button" onClick={onClose} className="w-full text-xs font-medium text-amber-700 dark:text-amber-400 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                Fechar
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!emailWarning && <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="flex-1 btn-primary justify-center py-2.5" disabled={loading}>
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>Salvando...</>
              ) : isEdit ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </div>}
        </form>
      </div>
    </div>
  )
}

/* ─── VincularModal ─────────────────────────────────────────────────────── */
interface Proposta {
  user_id: number; user_name: string; user_email: string; user_role: string
  colaborador_id: number; colaborador_nome: string; colaborador_cargo: string; colaborador_area: string
  score: number
}

function VincularModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    api.users.proposeLinks()
      .then(r => {
        const props = (r as any).propostas as Proposta[]
        setPropostas(props)
        setSelecionados(new Set(props.filter(p => p.score >= 80).map(p => p.user_id)))
      })
      .catch(() => setError('Erro ao carregar sugestões'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(userId: number) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  async function aplicar() {
    const aprovados = propostas.filter(p => selecionados.has(p.user_id))
    if (aprovados.length === 0) return
    setApplying(true)
    let count = 0
    try {
      for (const p of aprovados) {
        await api.users.update(p.user_id, { colaborador_id: p.colaborador_id })
        count++
      }
      setApplied(count)
      onDone()
    } catch {
      setError('Erro ao aplicar vínculos')
    } finally {
      setApplying(false)
    }
  }

  function scoreColor(s: number) {
    if (s === 100) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    if (s >= 80)  return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Link2 size={18} className="text-primary-500" /> Vincular Usuários a Colaboradores
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Revise as sugestões automáticas por similaridade de nome. Desmarque as incorretas antes de aplicar.
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-sm text-slate-400 text-center py-8">Analisando correspondências...</p>}
          {!loading && propostas.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma correspondência encontrada. Todos os usuários já estão vinculados ou sem colaborador correspondente.</p>
          )}
          {!loading && propostas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                <span className="font-semibold text-emerald-600">{selecionados.size}</span> de {propostas.length} selecionados para vincular
              </p>
              {propostas.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => toggle(p.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    selecionados.has(p.user_id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                    selecionados.has(p.user_id) ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {selecionados.has(p.user_id) && <CheckSquare size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Usuário</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.user_name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.user_email}</p>
                      <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{p.user_role}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Colaborador</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.colaborador_nome}</p>
                      <p className="text-xs text-slate-400 truncate">{p.colaborador_cargo}{p.colaborador_area ? ` · ${p.colaborador_area}` : ''}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${scoreColor(p.score)}`}>{p.score}%</span>
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          {applied > 0 && <p className="text-sm text-emerald-600 font-semibold mt-3">{applied} vínculo(s) aplicado(s) com sucesso.</p>}
        </div>

        {!loading && propostas.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Fechar
            </button>
            <button
              onClick={aplicar}
              disabled={applying || selecionados.size === 0}
              className="flex-1 btn-primary justify-center py-2.5"
            >
              {applying ? <><RefreshCw size={14} className="animate-spin" /> Aplicando...</> : `Vincular ${selecionados.size} usuário(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers]         = useState<AppUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modalUser, setModalUser] = useState<AppUser | null | undefined>(undefined)
  const [resendingId, setResendingId]   = useState<number | null>(null)
  const [resendStatus, setResendStatus] = useState<{ id: number; ok: boolean; msg: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [importingGestores, setImportingGestores] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)
  const [selectedGestores, setSelectedGestores] = useState<Set<number>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [sendingInvites, setSendingInvites] = useState(false)
  const [showVincular, setShowVincular] = useState(false)

  const userIsAdmin = currentUser?.role === 'Administrador de RH' || currentUser?.role === 'Administrador de TI' || currentUser?.role === 'Administrador Master'

  async function load() {
    try {
      setLoading(true)
      const data = await api.users.list() as AppUser[]
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function resendInvite(u: AppUser) {
    setResendingId(u.id)
    setResendStatus(null)
    try {
      await api.users.resendInvite(u.id)
      setResendStatus({ id: u.id, ok: true, msg: `Convite reenviado para ${u.email}` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao reenviar'
      setResendStatus({ id: u.id, ok: false, msg })
    } finally {
      setResendingId(null)
      setTimeout(() => setResendStatus(null), 6000)
    }
  }

  async function toggleActive(u: AppUser) {
    if (u.id === currentUser?.id) return
    try {
      if (u.active) await api.users.deactivate(u.id)
      else await api.users.update(u.id, { active: true })
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await api.users.delete(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir'
      setResendStatus({ id: deleteTarget.id, ok: false, msg })
      setDeleteTarget(null)
      setTimeout(() => setResendStatus(null), 6000)
    } finally {
      setDeleting(false)
    }
  }

  async function confirmBulkDeleteFn() {
    setDeletingBulk(true)
    const count = selectedGestores.size
    try {
      await Promise.all([...selectedGestores].map(id => api.users.delete(id)))
      setSelectedGestores(new Set())
      setConfirmBulkDelete(false)
      await load()
      setResendStatus({ id: 0, ok: true, msg: `${count} gestor(es) excluído(s) com sucesso` })
      setTimeout(() => setResendStatus(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir'
      setResendStatus({ id: 0, ok: false, msg })
      setTimeout(() => setResendStatus(null), 6000)
    } finally {
      setDeletingBulk(false)
    }
  }

  async function sendAllPendingInvites() {
    const pending = users.filter(u => u.role === 'Gestor' && u.must_change_password && u.active)
    if (pending.length === 0) return
    setSendingInvites(true)
    try {
      let sent = 0
      let failed = 0
      for (const u of pending) {
        try { await api.users.resendInvite(u.id); sent++ } catch { failed++ }
      }
      const msg = failed > 0
        ? `${sent} convite(s) enviado(s) · ${failed} falha(s)`
        : `${sent} convite(s) enviado(s) com sucesso`
      setResendStatus({ id: 0, ok: failed === 0, msg })
      setTimeout(() => setResendStatus(null), 6000)
    } finally {
      setSendingInvites(false)
    }
  }

  const filtered = users.filter((u) => {
    const s = search.toLowerCase()
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s)
  })

  const admins  = filtered.filter((u) => u.role === 'Administrador de RH' || u.role === 'Administrador de TI' || u.role === 'Administrador de RH / Gestor')
  const gestores = filtered.filter((u) => u.role === 'Gestor')
  const outros  = filtered.filter((u) => u.role !== 'Administrador de RH' && u.role !== 'Administrador de TI' && u.role !== 'Gestor' && u.role !== 'Administrador de RH / Gestor')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Usuários</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Gerencie contas e permissões de acesso</p>
        </div>
        {userIsAdmin && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={async () => {
                setImportingGestores(true)
                setImportResult(null)
                try {
                  const r = await (api as any).setupGestores() as { created: number; updated: number; skipped: number }
                  setImportResult(r)
                  await load()
                } finally {
                  setImportingGestores(false)
                }
              }}
              disabled={importingGestores}
              className="btn-secondary gap-2"
              title="Cria automaticamente usuários para todos os gestores cadastrados nos colaboradores"
            >
              {importingGestores ? <RefreshCw size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Importar Gestores
            </button>
            {users.some(u => u.role === 'Gestor' && u.must_change_password && u.active) && (
              <button
                onClick={sendAllPendingInvites}
                disabled={sendingInvites}
                className="btn-secondary gap-2"
                title="Reenviar convite para todos os gestores com convite pendente"
              >
                {sendingInvites ? <RefreshCw size={15} className="animate-spin" /> : <MailCheck size={15} />}
                Enviar Convites ({users.filter(u => u.role === 'Gestor' && u.must_change_password && u.active).length})
              </button>
            )}
            <button onClick={() => setShowVincular(true)} className="btn-secondary gap-2" title="Vincular automaticamente usuários aos seus perfis de colaborador">
              <Link2 size={15} /> Vincular Colaboradores
            </button>
            <button onClick={() => setModalUser(null)} className="btn-primary">
              <Plus size={16} /> Novo Usuário
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de usuários', value: users.length, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
          { label: 'Gestores', value: users.filter(u => u.role === 'Gestor' || u.role === 'Administrador de RH / Gestor').length, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
          { label: 'Ativos', value: users.filter(u => u.active).length, color: 'text-primary-700 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card p-4 border ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome, e-mail ou perfil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Resend status toast */}
      {resendStatus && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          resendStatus.ok
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {resendStatus.ok
            ? <CheckCircle2 size={16} className="shrink-0" />
            : <AlertTriangle size={16} className="shrink-0" />}
          {resendStatus.msg}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {/* Barra de exclusão em lote de gestores */}
      {userIsAdmin && selectedGestores.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-slide-up">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {selectedGestores.size} gestor(es) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedGestores(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/50 transition-colors"
            >
              Limpar seleção
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={13} /> Excluir selecionados
            </button>
          </div>
        </div>
      )}

      {/* User groups */}
      {!loading && [
        { title: 'Administradores de RH', icon: ShieldCheck, list: admins,   iconColor: 'text-primary-600 dark:text-primary-400', bgColor: 'bg-primary-100 dark:bg-primary-900/30', selectable: false },
        { title: 'Gestores',              icon: Wrench,      list: gestores, iconColor: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', selectable: true  },
        { title: 'Outros',                icon: Users,       list: outros,   iconColor: 'text-slate-500 dark:text-slate-400',    bgColor: 'bg-slate-100 dark:bg-slate-700',          selectable: false },
      ].map(({ title, icon: Icon, list, iconColor, bgColor, selectable }) => {
        const allSel = selectable && list.length > 0 && list.every(u => selectedGestores.has(u.id))
        const someSel = selectable && list.some(u => selectedGestores.has(u.id))
        return list.length > 0 && (
          <div key={title} className="card overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              {userIsAdmin && selectable && (
                <button
                  onClick={() => {
                    if (allSel) setSelectedGestores(prev => { const n = new Set(prev); list.forEach(u => n.delete(u.id)); return n })
                    else setSelectedGestores(prev => { const n = new Set(prev); list.forEach(u => n.add(u.id)); return n })
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title={allSel ? 'Desmarcar todos' : 'Selecionar todos'}
                >
                  {allSel ? <CheckSquare size={16} className="text-red-500" /> : someSel ? <CheckSquare size={16} className="text-red-300" /> : <Square size={16} />}
                </button>
              )}
              <div className={`w-6 h-6 rounded-lg ${bgColor} flex items-center justify-center`}>
                <Icon size={13} className={iconColor} />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
              <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{list.length}</span>
            </div>

            {/* User rows */}
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {list.map((u) => (
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors ${!u.active ? 'opacity-50' : ''} ${selectedGestores.has(u.id) ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                  {/* Checkbox (apenas gestores) */}
                  {userIsAdmin && selectable && (
                    <button
                      onClick={() => setSelectedGestores(prev => { const n = new Set(prev); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n })}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      {selectedGestores.has(u.id) ? <CheckSquare size={16} className="text-red-500" /> : <Square size={16} />}
                    </button>
                  )}

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${avatarColor(u.id)} flex items-center justify-center shrink-0 text-white text-sm font-bold`}>
                    {initials(u.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                      {u.id === currentUser?.id && (
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-md font-medium">Você</span>
                      )}
                      {!u.active && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium">Inativo</span>
                      )}
                      {u.must_change_password && u.active && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-medium">
                          <Mail size={10} /> Convite pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{u.email}</p>
                    {u.area && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Área: <span className="font-medium text-slate-600 dark:text-slate-300">{u.area}</span></p>}
                  </div>

                  {/* Role badges */}
                  <div className="hidden sm:flex flex-wrap gap-1.5">
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_STYLE[u.role] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                      {u.role}
                    </span>
                    {(u.roles ?? []).filter(r => SECONDARY_ROLES.includes(r)).map(r => (
                      <span key={r} className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_STYLE[r] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  {userIsAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Reenviar convite — só aparece para usuários com primeiro acesso pendente */}
                      {u.must_change_password && u.active && (
                        <button
                          onClick={() => resendInvite(u)}
                          disabled={resendingId === u.id}
                          title="Reenviar e-mail de convite"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors disabled:opacity-50"
                        >
                          {resendingId === u.id
                            ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                            : <Send size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => setModalUser(u)}
                        title="Editar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => toggleActive(u)}
                            title={u.active ? 'Desativar' : 'Ativar'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                              u.active
                                ? 'text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400'
                                : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                          >
                            {u.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            title="Excluir permanentemente"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {!loading && filtered.length === 0 && (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users size={24} className="text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Nenhum usuário encontrado</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">Tente ajustar o filtro de busca</p>
        </div>
      )}

      {/* Modal */}
      {showVincular && (
        <VincularModal
          onClose={() => setShowVincular(false)}
          onDone={async () => { setShowVincular(false); await load() }}
        />
      )}

      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={async () => { setModalUser(undefined); await load() }}
          currentUserRole={currentUser?.role}
          knownAreas={[...new Set(users.map(u => u.area).filter((a): a is string => !!a))].sort()}
        />
      )}

      {/* Confirm permanent delete — individual */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Excluir usuário permanentemente"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}" de forma permanente? Esta ação é irreversível e todos os dados do usuário serão removidos do sistema.`}
      />

      {/* Confirm bulk delete — gestores */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={confirmBulkDeleteFn}
        loading={deletingBulk}
        title={`Excluir ${selectedGestores.size} gestor(es) permanentemente`}
        message={`Tem certeza que deseja excluir os ${selectedGestores.size} gestor(es) selecionados? Esta ação é irreversível.`}
      />

      {importResult && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-lg max-w-sm animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Gestores importados</p>
            <p className="text-xs opacity-70 mt-0.5">
              {importResult.created > 0 && `${importResult.created} criado(s)`}
              {importResult.created > 0 && (importResult.updated > 0 || importResult.skipped > 0) && ' · '}
              {importResult.updated > 0 && `${importResult.updated} e-mail(s) atualizado(s)`}
              {importResult.updated > 0 && importResult.skipped > 0 && ' · '}
              {importResult.skipped > 0 && `${importResult.skipped} sem alteração`}
            </p>
            <p className="text-xs opacity-50 mt-0.5">Senhas temporárias individuais retornadas na resposta da API.</p>
          </div>
          <button onClick={() => setImportResult(null)} className="ml-auto opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
