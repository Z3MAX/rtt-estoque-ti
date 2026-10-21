import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Building2, ClipboardCheck,
  TrendingUp, ListChecks, CalendarRange, Shield, UserCog, ChevronRight,
} from 'lucide-react'
import { useAuth, isAdmin, isMaster } from '../lib/auth'

const navItems = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard',          adminOnly: false, masterOnly: false },
  { to: '/colaboradores',      icon: ClipboardList,   label: 'Colaboradores',      adminOnly: false, masterOnly: false },
  { to: '/departamentos',      icon: Building2,       label: 'Departamentos',      adminOnly: false, masterOnly: false },
  { to: '/realizar-avaliacao', icon: ClipboardCheck,  label: 'Realizar Avaliação', adminOnly: false, masterOnly: false },
  { to: '/metas',              icon: TrendingUp,      label: 'Metas',              adminOnly: false, masterOnly: false },
  { to: '/avaliacoes',         icon: ListChecks,      label: 'Avaliações',         adminOnly: true,  masterOnly: false },
  { to: '/ciclo-avaliacao',    icon: CalendarRange,   label: 'Ciclo de Avaliação', adminOnly: true,  masterOnly: false },
  { to: '/auditoria',          icon: Shield,          label: 'Auditoria',          adminOnly: false, masterOnly: true  },
  { to: '/corrigir-gestor',    icon: UserCog,         label: 'Corrigir Gestor',    adminOnly: false, masterOnly: true  },
]

export default function AvaliacoesSubLayout() {
  const { user } = useAuth()
  const userIsAdmin  = isAdmin(user?.role)
  const userIsMaster = isMaster(user?.role)

  return (
    <div className="flex flex-col md:flex-row gap-4 min-h-[calc(100vh-3.5rem-48px)]">
      {/* Sub-menu: barra horizontal rolável no celular, lateral fixa a partir de md */}
      <aside className="md:w-52 md:shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 px-2 py-2 md:px-3 md:py-4 flex flex-row md:flex-col gap-1 md:gap-0.5 overflow-x-auto md:overflow-visible md:self-start md:sticky md:top-[calc(3.5rem+24px)]">
        <p className="hidden md:block px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Menu</p>
        {navItems
          .filter(({ adminOnly, masterOnly }) => (!adminOnly || userIsAdmin) && (!masterOnly || userIsMaster))
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} />
                    {label}
                  </div>
                  {isActive && <ChevronRight size={13} className="hidden md:block opacity-70" />}
                </>
              )}
            </NavLink>
          ))}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
