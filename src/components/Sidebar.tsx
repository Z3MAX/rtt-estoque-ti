import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Monitor, Tag, MapPin, Server, ChevronRight, LogOut, UserCircle, Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    adminOnly: false },
  { to: '/equipamentos', icon: Monitor,          label: 'Equipamentos', adminOnly: false },
  { to: '/categorias',   icon: Tag,              label: 'Categorias',   adminOnly: false },
  { to: '/locais',       icon: MapPin,           label: 'Locais',       adminOnly: false },
  { to: '/usuarios',     icon: Users,            label: 'Usuários',     adminOnly: true  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'Administrador de TI'

  return (
    <aside className="w-64 h-screen sticky top-0 overflow-y-auto flex flex-col shrink-0 bg-white border-r border-slate-200">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center">
          <img
            src="/rema-logo.png"
            alt="Rema Tip Top"
            className="h-10 w-auto object-contain select-none"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              const fallback = el.nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          {/* Fallback if logo not found */}
          <div className="hidden items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Server size={18} className="text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-base leading-none">RTT</p>
              <p className="text-slate-400 text-xs mt-0.5">Controle de TI</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2 font-medium">Controle de Estoque TI</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Menu</p>
        {navItems.filter(({ adminOnly }) => !adminOnly || isAdmin).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
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

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <UserCircle size={18} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
        <p className="text-slate-400 text-xs mt-3 px-1">v1.0.0 &mdash; Rema Tip Top</p>
      </div>
    </aside>
  )
}
