import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider, ForceLightMode } from './lib/theme'
import LoginPage from './components/LoginPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'
import ChangePasswordPage from './components/ChangePasswordPage'
import Layout from './components/Layout'
import Dashboard from './components/pages/Dashboard'
import EquipmentPage from './components/pages/Equipment'
import CategoriesPage from './components/pages/Categories'
import LocationsPage from './components/pages/Locations'
import UsersPage from './components/pages/Users'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

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

  // First login — force password change before anything else
  if (user.mustChangePassword) return <ForceLightMode><ChangePasswordPage /></ForceLightMode>

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipamentos" element={<EquipmentPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/locais" element={<LocationsPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
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
          <Route path="/reset-password" element={<ForceLightMode><ResetPasswordPage /></ForceLightMode>} />
          <Route path="*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
