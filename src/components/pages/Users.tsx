import { useState, useEffect, type FormEvent } from 'react'
import { Users, Plus, Pencil, ShieldCheck, Wrench, ToggleLeft, ToggleRight, X, Eye, EyeOff, Search, Mail, AlertTriangle, CheckCircle2, Send, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import ConfirmDialog from '../ui/ConfirmDialog'

interface AppUser {
  id: number
  name: string
  email: string
  role: string
  active: boolean
  must_change_password?: boolean
  created_at: string
}

const ROLES = ['Administrador de TI', 'Técnico de TI']

const ROLE_STYLE: Record<string, string> = {
  'Administrador de TI': 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800',
  'Técnico de TI':       'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
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
}

function UserModal({ user, onClose, onSaved }: ModalProps) {
  const isEdit = !!user
  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState(user?.role ?? 'Técnico de TI')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [emailWarning, setEmailWarning] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Nome e e-mail são obrigatórios'); return }
    if (!isEdit && !password) { setError('Senha obrigatória para novo usuário'); return }

    try {
      setLoading(true); setError(''); setEmailWarning(null)
      if (isEdit) {
        const payload: Record<string, unknown> = { name, email, role }
        if (password) payload.password = password
        await api.users.update(user!.id, payload)
        onSaved()
      } else {
        const result = await api.users.create({ name, email, password, role }) as { emailSent?: boolean; emailError?: string }
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
          <div>
            <label className="label">{isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPass ? 'text' : 'password'}
                placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'}
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
          <div>
            <label className="label">Perfil de acesso</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

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
                Verifique as variáveis <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">SITE_URL</code>, <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">GMAIL_USER</code> e <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">GMAIL_APP_PASSWORD</code> no Netlify.
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

  const isAdmin = currentUser?.role === 'Administrador de TI'

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

  const filtered = users.filter((u) => {
    const s = search.toLowerCase()
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s)
  })

  const admins = filtered.filter((u) => u.role === 'Administrador de TI')
  const techs  = filtered.filter((u) => u.role !== 'Administrador de TI')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Usuários</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Gerencie contas e permissões de acesso</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalUser(null)} className="btn-primary shrink-0">
            <Plus size={16} /> Novo Usuário
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de usuários', value: users.length, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
          { label: 'Administradores',   value: users.filter(u => u.role === 'Administrador de TI').length, color: 'text-primary-700 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' },
          { label: 'Ativos',            value: users.filter(u => u.active).length, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
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

      {/* User groups */}
      {!loading && [
        { title: 'Administradores', icon: ShieldCheck, list: admins, iconColor: 'text-primary-600 dark:text-primary-400', bgColor: 'bg-primary-100 dark:bg-primary-900/30' },
        { title: 'Técnicos de TI',  icon: Wrench,      list: techs,  iconColor: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
      ].map(({ title, icon: Icon, list, iconColor, bgColor }) =>
        list.length > 0 && (
          <div key={title} className="card overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <div className={`w-6 h-6 rounded-lg ${bgColor} flex items-center justify-center`}>
                <Icon size={13} className={iconColor} />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
              <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{list.length}</span>
            </div>

            {/* User rows */}
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {list.map((u) => (
                <div key={u.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
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
                  </div>

                  {/* Role badge */}
                  <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_STYLE[u.role] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                    {u.role}
                  </span>

                  {/* Actions */}
                  {isAdmin && (
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
      )}

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
      {modalUser !== undefined && (
        <UserModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={async () => { setModalUser(undefined); await load() }}
        />
      )}

      {/* Confirm permanent delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Excluir usuário permanentemente"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}" de forma permanente? Esta ação é irreversível e todos os dados do usuário serão removidos do sistema.`}
      />
    </div>
  )
}
