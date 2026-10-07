import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, BookOpen, Megaphone, GraduationCap, Users, ClipboardList,
  LogOut, ChevronDown, Menu, X, Bell, SmilePlus, BarChart3, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import ChatBot from './ChatBot'
import Avatar from './ui/Avatar'
import PhotoUploadModal from './ui/PhotoUploadModal'

const AVALIACOES_PATHS = [
  '/dashboard', '/colaboradores', '/departamentos', '/realizar-avaliacao',
  '/avaliacoes', '/metas', '/usuarios', '/auditoria', '/ciclo-avaliacao',
  '/corrigir-gestor', '/monitor',
]

const NAV = [
  { to: '/intranet',              icon: Home,          label: 'Minha Visão',  adminOnly: false },
  { to: '/intranet/treinamentos', icon: GraduationCap, label: 'Treinamentos', adminOnly: false },
  { to: '/intranet/comunicados',  icon: Megaphone,     label: 'Comunicados',  adminOnly: false },
  { to: '/intranet/pdi',         icon: BookOpen,      label: 'PDI',          adminOnly: false },
  { to: '/intranet/equipe',      icon: Users,         label: 'Minha Equipe', adminOnly: false },
  { to: '/intranet/pesquisas',   icon: ClipboardList, label: 'Pesquisas',    adminOnly: false },
  { to: '/intranet/carreira',    icon: TrendingUp,    label: 'Carreira',     adminOnly: false },
  { to: '/dashboard',            icon: BarChart3,     label: 'Avaliações',   adminOnly: false },
  { to: '/intranet/feedbacks',   icon: SmilePlus,     label: 'Humor',        adminOnly: true  },
]

const ADMIN_NAV_ROLES = ['Administrador de RH', 'Administrador Master', 'Administrador de RH / Gestor']

export default function IntranetLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)

  const isActive = (to: string) => {
    if (to === '/dashboard') {
      return AVALIACOES_PATHS.some(p =>
        location.pathname === p || location.pathname.startsWith(p + '/')
      )
    }
    if (to === '/intranet') return location.pathname === '/intranet'
    return location.pathname.startsWith(to)
  }

  const visibleNav = NAV.filter(n => !n.adminOnly || ADMIN_NAV_ROLES.includes(user?.role ?? ''))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shrink-0">
        <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <img src="/rema-logo-v2.png" alt="Rema" className="h-12 object-contain" />
            <span className="hidden lg:block text-xs font-semibold text-slate-400 uppercase tracking-widest">Intranet</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {visibleNav.map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive(to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          {/* Right: notification + user */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Bell */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Bell size={17} />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Avatar name={user?.name ?? 'U'} photoUrl={user?.photo_url} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <Avatar name={user?.name ?? ''} photoUrl={user?.photo_url} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); setPhotoModal(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Users size={14} /> Alterar foto
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 flex flex-col gap-1">
            {visibleNav.map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                onClick={() => { navigate(to); setMobileOpen(false) }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 w-full px-4 py-6">
        <Outlet />
      </main>

      <ChatBot />
      {photoModal && <PhotoUploadModal onClose={() => setPhotoModal(false)} />}
    </div>
  )
}
