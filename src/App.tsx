import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth, isAdmin, isMaster } from './lib/auth'
import { ThemeProvider, ForceLightMode } from './lib/theme'
import LoginPage from './components/LoginPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import AssinarPage from './components/pages/AssinarPage'
import ChangePasswordPage from './components/ChangePasswordPage'
import Layout from './components/Layout'
import PortalSelector from './components/PortalSelector'
import IntranetLayout from './components/IntranetLayout'
import Dashboard from './components/pages/Dashboard'
import ColaboradoresPage from './components/pages/Colaboradores'
import ColaboradorPerfil from './components/pages/ColaboradorPerfil'
import NovaAvaliacao from './components/pages/NovaAvaliacao'
import UsersPage from './components/pages/Users'
import AuditMonitor from './components/pages/AuditMonitor'
import DepartamentosPage from './components/pages/Departamentos'
import DepartamentoDetalhe from './components/pages/DepartamentoDetalhe'
import RealizarAvaliacaoPage from './components/pages/RealizarAvaliacao'
import AvaliacaoDetalhe from './components/pages/AvaliacaoDetalhe'
import AvaliacoesPage from './components/pages/Avaliacoes'
import AuditoriaPage from './components/pages/Auditoria'
import CicloAvaliacaoPage from './components/pages/CicloAvaliacao'
import MinhaVisao from './components/pages/intranet/MinhaVisao'
import TreinamentosPage from './components/pages/intranet/Treinamentos'
import CursoDetalhe from './components/pages/intranet/CursoDetalhe'
import ComunicadosPage from './components/pages/intranet/Comunicados'
import PDIPage from './components/pages/intranet/PDI'
import EquipePage from './components/pages/intranet/Equipe'
import PesquisasIntranetPage from './components/pages/intranet/Pesquisas'
import PesquisaResponder from './components/pages/intranet/PesquisaResponder'
import PesquisaPublica from './components/pages/PesquisaPublica'
import PresencaPublica from './components/pages/PresencaPublica'
import FeedbacksPage from './components/pages/intranet/Feedbacks'

type Portal = 'avaliacao' | 'intranet' | null

/** A quais portal um caminho profundo (ex: link de e-mail) pertence, para
 *  pular a tela de seleção de portal e já cair direto na página certa. */
function portalDoCaminho(path: string): Portal {
  if (path.startsWith('/intranet')) return 'intranet'
  if (['/dashboard', '/colaboradores', '/avaliacoes', '/departamentos', '/realizar-avaliacao', '/monitor', '/usuarios', '/auditoria', '/ciclo-avaliacao'].some(p => path.startsWith(p))) {
    return 'avaliacao'
  }
  return null
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  // Captura o caminho original (ex: de um link de e-mail) uma única vez, antes
  // de qualquer redirecionamento — usado para retomar essa página após o
  // login e a seleção de portal, em vez de sempre cair na tela inicial.
  const deepLinkRef = useRef<string | null>(
    window.location.pathname !== '/' ? window.location.pathname + window.location.search : null
  )
  const [portal, setPortal] = useState<Portal>(() => {
    const stored = localStorage.getItem('rtt_portal')
    if (stored === 'avaliacao' || stored === 'intranet') return stored
    return null
  })

  // Reset portal on fresh login (user transitions null → non-null).
  // On page reload the same transition happens, but login() already cleared
  // 'rtt_portal' from localStorage before the transition — so we use the
  // presence of that key to distinguish reload (keep portal) from fresh login (reset).
  const prevUserIdRef = useRef<number | undefined>(user?.id)
  useEffect(() => {
    const prevId = prevUserIdRef.current
    prevUserIdRef.current = user?.id
    if (!prevId && user?.id && !localStorage.getItem('rtt_portal')) {
      // Login recém-efetuado — se veio de um link profundo (ex: e-mail de
      // pesquisa), já escolhe o portal certo em vez de mostrar o seletor.
      const alvo = deepLinkRef.current ? portalDoCaminho(deepLinkRef.current) : null
      if (alvo) {
        localStorage.setItem('rtt_portal', alvo)
        setPortal(alvo)
      } else {
        setPortal(null)
      }
    }
  }, [user?.id])

  // Assim que usuário e portal estiverem prontos, retoma o caminho original
  // (se houver) — cobre tanto o caso de já estar logado quanto o pós-login.
  useEffect(() => {
    if (!user || !portal || !deepLinkRef.current) return
    const alvo = deepLinkRef.current
    deepLinkRef.current = null
    if (window.location.pathname + window.location.search !== alvo) {
      navigate(alvo, { replace: true })
    }
  }, [user, portal, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <ForceLightMode><LoginPage /></ForceLightMode>
  if (user.mustChangePassword) return <ForceLightMode><ChangePasswordPage /></ForceLightMode>

  // Portal selector
  if (!portal) {
    return (
      <ForceLightMode>
        <PortalSelector onSelect={p => setPortal(p)} />
      </ForceLightMode>
    )
  }

  // Intranet portal
  if (portal === 'intranet') {
    return (
      <Routes>
        <Route element={<IntranetLayout onSwitchPortal={() => setPortal(null)} />}>
          <Route path="/" element={<Navigate to="/intranet" replace />} />
          <Route path="/intranet" element={<MinhaVisao />} />
          <Route path="/intranet/treinamentos" element={<TreinamentosPage />} />
          <Route path="/intranet/treinamentos/:id" element={<CursoDetalhe />} />
          <Route path="/intranet/comunicados" element={<ComunicadosPage />} />
          <Route path="/intranet/pdi" element={<PDIPage />} />
          <Route path="/intranet/equipe" element={<EquipePage />} />
          <Route path="/intranet/pesquisas" element={<PesquisasIntranetPage />} />
          <Route path="/intranet/pesquisas/:id/responder" element={<PesquisaResponder />} />
          <Route path="/intranet/feedbacks" element={<FeedbacksPage />} />
          <Route path="*" element={<Navigate to="/intranet" replace />} />
        </Route>
      </Routes>
    )
  }

  // Avaliação portal (existing)
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/colaboradores/:id" element={<ColaboradorPerfil />} />
        <Route path="/avaliacoes/nova/:colaboradorId" element={<NovaAvaliacao />} />
        <Route path="/departamentos" element={<DepartamentosPage />} />
        <Route path="/departamentos/:area" element={<DepartamentoDetalhe />} />
        <Route path="/realizar-avaliacao" element={<RealizarAvaliacaoPage />} />
        <Route path="/avaliacoes" element={isAdmin(user?.role) ? <AvaliacoesPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/avaliacoes/:id" element={<AvaliacaoDetalhe />} />
        <Route path="/monitor" element={<AuditMonitor />} />
        <Route path="/usuarios" element={isAdmin(user?.role) ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/auditoria" element={isMaster(user?.role) ? <AuditoriaPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/ciclo-avaliacao" element={isAdmin(user?.role) ? <CicloAvaliacaoPage /> : <Navigate to="/dashboard" replace />} />
<Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/forgot-password" element={<ForceLightMode><ForgotPasswordPage /></ForceLightMode>} />
          <Route path="/reset-password"  element={<ForceLightMode><ResetPasswordPage /></ForceLightMode>} />
          <Route path="/assinar/:token"  element={<ForceLightMode><AssinarPage /></ForceLightMode>} />
          <Route path="/p/:token"        element={<PesquisaPublica />} />
          <Route path="/presenca/:token" element={<PresencaPublica />} />
          <Route path="*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
