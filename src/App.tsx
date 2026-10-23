import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth, isAdmin, isMaster, isColaborador } from './lib/auth'
import { ThemeProvider, ForceLightMode } from './lib/theme'
import LoginPage from './components/LoginPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import AssinarPage from './components/pages/AssinarPage'
import ChangePasswordPage from './components/ChangePasswordPage'
import IntranetLayout from './components/IntranetLayout'
import AvaliacoesSubLayout from './components/AvaliacoesSubLayout'
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
import CorrigirGestorPage from './components/pages/CorrigirGestor'
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
import CarreiraPage from './components/pages/intranet/Carreira'
import MetasPage from './components/pages/Metas'

// Telas "de seção": se o login aconteceu em uma delas, o usuário vai para Minha Visão.
// Qualquer outro endereço (ex.: /avaliacoes/12, /intranet/pesquisas/3/responder, ou com ?parametros)
// é um link específico — por exemplo vindo de e-mail — e é preservado.
const SECTION_PATHS = new Set([
  '/', '/intranet', '/intranet/treinamentos', '/intranet/comunicados', '/intranet/pesquisas',
  '/intranet/carreira', '/intranet/pdi', '/intranet/equipe', '/intranet/feedbacks',
  '/dashboard', '/colaboradores', '/departamentos', '/realizar-avaliacao', '/avaliacoes',
  '/metas', '/usuarios', '/ciclo-avaliacao', '/monitor', '/auditoria', '/corrigir-gestor',
])

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  // Depois de um login (a tela de login foi exibida e agora há usuário), abre em Minha Visão.
  // Quem só teve a sessão restaurada pelo cookie (sem passar pelo login) fica onde estava.
  const sawLoginScreen = useRef(false)
  if (!loading && !user) sawLoginScreen.current = true
  useEffect(() => {
    if (!user || !sawLoginScreen.current) return
    sawLoginScreen.current = false
    if (!search && SECTION_PATHS.has(pathname) && pathname !== '/intranet') {
      navigate('/intranet', { replace: true })
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Colaborador: somente Intranet (treinamentos, comunicados, pesquisas). O bloqueio real
  // está no backend (_auth.js); aqui só evitamos que ele navegue para telas que dariam 403.
  if (isColaborador(user.role)) {
    return (
      <Routes>
        <Route element={<IntranetLayout />}>
          <Route path="/intranet" element={<MinhaVisao />} />
          <Route path="/intranet/treinamentos" element={<TreinamentosPage />} />
          <Route path="/intranet/treinamentos/:id" element={<CursoDetalhe />} />
          <Route path="/intranet/comunicados" element={<ComunicadosPage />} />
          <Route path="/intranet/pesquisas" element={<PesquisasIntranetPage />} />
          <Route path="/intranet/pesquisas/:id/responder" element={<PesquisaResponder />} />
          <Route path="/intranet/carreira" element={<CarreiraPage />} />
          <Route path="*" element={<Navigate to="/intranet" replace />} />
        </Route>
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<IntranetLayout />}>
        {/* Redireciona raiz para intranet */}
        <Route path="/" element={<Navigate to="/intranet" replace />} />

        {/* Intranet */}
        <Route path="/intranet" element={<MinhaVisao />} />
        <Route path="/intranet/treinamentos" element={<TreinamentosPage />} />
        <Route path="/intranet/treinamentos/:id" element={<CursoDetalhe />} />
        <Route path="/intranet/comunicados" element={<ComunicadosPage />} />
        <Route path="/intranet/pdi" element={<PDIPage />} />
        <Route path="/intranet/equipe" element={<EquipePage />} />
        <Route path="/intranet/pesquisas" element={<PesquisasIntranetPage />} />
        <Route path="/intranet/pesquisas/:id/responder" element={<PesquisaResponder />} />
        <Route path="/intranet/carreira" element={<CarreiraPage />} />
        <Route path="/intranet/feedbacks" element={<FeedbacksPage />} />

        {/* Usuários: administração do sistema, fora do módulo de Avaliações */}
        <Route path="/usuarios" element={isAdmin(user?.role) ? <UsersPage /> : <Navigate to="/intranet" replace />} />

        {/* Avaliações — sub-layout com sidebar própria */}
        <Route element={<AvaliacoesSubLayout />}>
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
          <Route path="/auditoria" element={isMaster(user?.role) ? <AuditoriaPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/corrigir-gestor" element={isMaster(user?.role) ? <CorrigirGestorPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/ciclo-avaliacao" element={isAdmin(user?.role) ? <CicloAvaliacaoPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/metas" element={<MetasPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/intranet" replace />} />
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
