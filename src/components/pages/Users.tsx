import { useState, useEffect, type FormEvent } from 'react'
import { Users, Plus, Pencil, ShieldCheck, Wrench, ToggleLeft, ToggleRight, X, Eye, EyeOff, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'

interface AppUser {
  id: number
  name: string
  email: string
  role: string
  active: boolean
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Nome e e-mail são obrigatórios'); return }
    if (!isEdit && !password) { setError('Senha obrigatória para novo usuário'); return }

    try {
      setLoading(true); setError('')
      if (isEdit) {
        const payload: Record<string, unknown> = { name, email, role }
        if (password) payload.password = password
        await api.users.update(user!.id, payload)
      } else {
        await api.users.create({ name, email, password, role })
      }
      onSaved()
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

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
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
          </div>
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                      {u.id === currentUser?.id && (
                        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-md font-medium">Você</span>
                      )}
                      {!u.active && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium">Inativo</span>
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
                      <button
                        onClick={() => setModalUser(u)}
                        title="Editar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {u.id !== currentUser?.id && (
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
    </div>
  )
}
