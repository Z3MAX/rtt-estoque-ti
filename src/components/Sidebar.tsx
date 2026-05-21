import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Monitor, Tag, MapPin, Server, ChevronRight, LogOut, UserCircle,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/equipamentos', icon: Monitor,          label: 'Equipamentos' },
  { to: '/categorias',   icon: Tag,              label: 'Categorias' },
  { to: '/locais',       icon: MapPin,           label: 'Locais' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 h-screen sticky top-0 overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Server size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">RTT</p>
            <p className="text-slate-400 text-xs mt-0.5">Controle de TI</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
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
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-primary-500/30 flex items-center justify-center shrink-0">
            <UserCircle size={18} className="text-primary-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-3 px-1">v1.0.0 &mdash; RTT TI</p>
      </div>
    </aside>
  )
}
