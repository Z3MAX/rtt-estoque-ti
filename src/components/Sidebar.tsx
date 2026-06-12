import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, LogOut,
  UserCircle, ChevronRight, Sun, Moon, ClipboardList, Building2, ClipboardCheck, ListChecks, Shield,
} from 'lucide-react'
import { useAuth, isAdmin, isMaster } from '../lib/auth'
import { useTheme } from '../lib/theme'

const navItems = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard',            adminOnly: false, masterOnly: false },
  { to: '/colaboradores',      icon: ClipboardList,   label: 'Colaboradores',        adminOnly: false, masterOnly: false },
  { to: '/departamentos',      icon: Building2,       label: 'Departamentos',        adminOnly: false, masterOnly: false },
  { to: '/realizar-avaliacao', icon: ClipboardCheck,  label: 'Realizar Avaliação',   adminOnly: false, masterOnly: false },
  { to: '/avaliacoes',         icon: ListChecks,      label: 'Avaliações',           adminOnly: true,  masterOnly: false },
  { to: '/usuarios',           icon: Users,           label: 'Usuários',             adminOnly: true,  masterOnly: false },
  { to: '/auditoria',          icon: Shield,          label: 'Auditoria',            adminOnly: false, masterOnly: true  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const userIsAdmin  = isAdmin(user?.role)
  const userIsMaster = isMaster(user?.role)

  return (
    <aside className="w-64 h-screen sticky top-0 overflow-y-auto flex flex-col shrink-0
                      bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center justify-center">
          <img
            src="/rema-logo.png"
            alt="Rema Tip Top"
            className="h-10 w-auto object-contain select-none dark:brightness-0 dark:invert"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              const fallback = el.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          <div className="hidden items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <p className="text-slate-900 dark:text-slate-100 font-bold text-base leading-none">RTT</p>
              <p className="text-slate-400 text-xs mt-0.5">Talentos</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2 font-medium">Avaliação de Talentos</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Menu</p>
        {navItems.filter(({ adminOnly, masterOnly }) => (!adminOnly || userIsAdmin) && (!masterOnly || userIsMaster)).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  {label}
                </div>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800
                     hover:text-slate-900 dark:hover:text-slate-100 transition-all"
        >
          {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          <span className="ml-auto">
            <span className={`inline-block w-8 h-4 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-primary-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
            </span>
          </span>
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
            <UserCircle size={18} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
        <p className="text-slate-400 text-xs mt-2 px-1">v2.0.0 &mdash; Rema Tip Top</p>
      </div>
    </aside>
  )
}
