import { useAuth } from '../lib/auth'
import { ClipboardCheck, BookOpen, LogOut, ChevronRight } from 'lucide-react'

interface Props {
  onSelect: (portal: 'avaliacao' | 'intranet') => void
}

export default function PortalSelector({ onSelect }: Props) {
  const { user, logout } = useAuth()

  function choose(portal: 'avaliacao' | 'intranet') {
    localStorage.setItem('rtt_portal', portal)
    onSelect(portal)
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Colaborador'
  const canAccessIntranet = user?.role === 'Administrador Master' || user?.role === 'Beta Teste'

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Painel esquerdo ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex-col justify-between relative overflow-hidden">

        {/* Blobs decorativos */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-primary-400/10 blur-3xl pointer-events-none" />

        {/* Logo + tagline */}
        <div className="relative z-10 px-12 pt-10">
          <div className="mb-10">
            <img
              src="/rema-logo.png"
              alt="Rema Tip Top"
              className="h-14 w-auto object-contain select-none"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight">
            Bem-vindo(a) de volta,<br />
            <span className="text-primary-400">{firstName}.</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-sm">
            Selecione o ambiente que deseja acessar. Você pode trocar de portal a qualquer momento pelo menu do sistema.
          </p>

          {/* Bullets */}
          <div className="mt-8 space-y-3">
            {[
              'Avaliação de talentos com Matriz 9-Box',
              'Ciclos de avaliação e calibração',
              'Intranet, treinamentos e PDI',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                </div>
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <div className="relative z-10 flex items-end justify-center flex-1 overflow-hidden">
          <img
            src="/rtt-hero.png"
            alt="Rema Tip Top"
            className="w-full object-contain object-bottom drop-shadow-2xl select-none"
            style={{ maxHeight: '520px', transform: 'translateX(-10%)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        <p className="text-slate-600 text-xs relative z-10 px-12 pb-6">
          © 2025 Rema Tip Top · Todos os direitos reservados
        </p>
      </div>

      {/* ── Painel direito ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img
              src="/rema-logo.png"
              alt="Rema Tip Top"
              className="h-8 w-auto object-contain select-none"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          {/* Card principal */}
          <div className="card p-8">

            {/* Header */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">Selecionar portal</h2>
              <p className="text-slate-500 text-sm mt-1">
                Olá, <span className="font-medium text-slate-700">{user?.name}</span>. Por onde deseja começar?
              </p>
            </div>

            {/* Opções */}
            <div className="space-y-3">

              {/* Avaliação de Talentos */}
              <button
                onClick={() => choose('avaliacao')}
                className="group w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-100 group-hover:bg-primary-500 flex items-center justify-center shrink-0 transition-colors">
                  <ClipboardCheck size={20} className="text-primary-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                    Avaliação de Talentos
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    Ciclos de avaliação, calibrações e Matriz 9-Box
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Intranet — apenas Administrador Master */}
              {canAccessIntranet && (
                <button
                  onClick={() => choose('intranet')}
                  className="group w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center shrink-0 transition-colors">
                    <BookOpen size={20} className="text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      Intranet & Treinamentos
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      Comunicados, trilhas de aprendizado e PDI
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )}
            </div>

            {/* Sair */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
                Sair da conta
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Rema Tip Top · Plataforma Interna
          </p>
        </div>
      </div>
    </div>
  )
}
