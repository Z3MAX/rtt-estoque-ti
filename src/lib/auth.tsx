import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const MOCK = import.meta.env.VITE_MOCK === 'true'

export interface User {
  id?: number
  name: string
  email: string
  role: string
  area?: string | null
  mustChangePassword?: boolean
}

export function isAdmin(role?: string) {
  return (
    role === 'Administrador de RH' ||
    role === 'Administrador de TI' ||
    role === 'Administrador Master' ||
    role === 'Administrador de RH / Gestor'
  )
}

export function isMaster(role?: string) {
  return role === 'Administrador Master'
}

export function isGestor(role?: string) {
  return role === 'Gestor' || role === 'Administrador de RH / Gestor'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// Usuários de demonstração (apenas para modo VITE_MOCK=true em desenvolvimento local)
// Não contém credenciais de produção
const DEMO_USERS: Record<string, { name: string; role: string; id: number }> = {
  'demo@rtt.dev': { id: 1, name: 'Demo Admin', role: 'Administrador de TI' },
  'tecnico@rtt.dev': { id: 2, name: 'Demo Técnico', role: 'Técnico de TI' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser  = localStorage.getItem('osiris_user')
    const storedToken = localStorage.getItem('osiris_token')
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)) } catch {}
    }
    if (storedToken) setToken(storedToken)
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 700))
      const found = DEMO_USERS[email.toLowerCase()]
      if (!found) throw new Error('E-mail ou senha incorretos')
      const u: User = { id: found.id, name: found.name, email: email.toLowerCase(), role: found.role }
      const mockToken = 'mock-token'
      setUser(u)
      setToken(mockToken)
      localStorage.setItem('osiris_user', JSON.stringify(u))
      localStorage.setItem('osiris_token', mockToken)
      localStorage.removeItem('rtt_portal')
      return
    }

    const res = await fetch('/.netlify/functions/auth-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao autenticar')

    setUser(data.user)
    setToken(data.token)
    localStorage.setItem('osiris_user', JSON.stringify(data.user))
    localStorage.setItem('osiris_token', data.token)
    localStorage.removeItem('rtt_portal')
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('osiris_user')
    localStorage.removeItem('osiris_token')
    localStorage.removeItem('rtt_portal')
  }

  function updateUser(updates: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem('osiris_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
