import { useAuth } from '../lib/auth'
import { ClipboardCheck, BookOpen, ArrowRight, LogOut } from 'lucide-react'

interface Props {
  onSelect: (portal: 'avaliacao' | 'intranet') => void
}

export default function PortalSelector({ onSelect }: Props) {
  const { user, logout } = useAuth()

  function choose(portal: 'avaliacao' | 'intranet') {
    localStorage.setItem('rtt_portal', portal)
    onSelect(portal)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src="/rema-logo.png" alt="Rema Tip Top" className="h-9 object-contain brightness-0 invert" />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-10">
        {/* Greeting */}
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-1">Bem-vindo(a),</p>
          <h1 className="text-3xl font-bold text-white">{user?.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 mt-2 text-sm">Selecione o ambiente que deseja acessar</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Avaliação */}
          <button
            onClick={() => choose('avaliacao')}
            className="group relative flex flex-col gap-5 p-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/60 transition-all duration-200 text-left hover:shadow-2xl hover:shadow-primary-500/10 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
              <ClipboardCheck size={26} className="text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-1">Avaliação de Talentos</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Gerencie ciclos de avaliação, calibrações e a Matriz 9-Box dos colaboradores.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary-400 text-sm font-medium group-hover:gap-3 transition-all">
              Acessar <ArrowRight size={15} />
            </div>
            <div className="absolute inset-0 rounded-2xl ring-2 ring-primary-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>

          {/* Intranet */}
          <button
            onClick={() => choose('intranet')}
            className="group relative flex flex-col gap-5 p-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/60 transition-all duration-200 text-left hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <BookOpen size={26} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-1">Intranet & Treinamentos</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Acesse comunicados, trilhas de treinamento, PDI e informações da empresa.
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
              Acessar <ArrowRight size={15} />
            </div>
            <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        </div>

        <p className="text-xs text-slate-600">Rema Tip Top · Plataforma Interna</p>
      </div>
    </div>
  )
}
