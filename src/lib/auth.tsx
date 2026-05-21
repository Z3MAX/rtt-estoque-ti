import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const MOCK = import.meta.env.VITE_MOCK === 'true'

export interface User {
  id?: number
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEMO_USERS: Record<string, { password: string; name: string; role: string; id: number }> = {
  'alexandre.amorim@rttshop.com.br': { id: 1, password: 'alexandre123', name: 'Alexandre Amorim', role: 'Administrador de TI' },
  'admin@rtt.com':                   { id: 2, password: 'admin123',      name: 'Administrador',   role: 'Administrador de TI' },
  'ti@rtt.com':                      { id: 3, password: 'ti1234',        name: 'Equipe TI',        role: 'Técnico de TI' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('osiris_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  async function login(email: string, password: string) {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 900))
      const found = DEMO_USERS[email.toLowerCase()]
      if (!found || found.password !== password) throw new Error('E-mail ou senha incorretos')
      const u: User = { id: found.id, name: found.name, email: email.toLowerCase(), role: found.role }
      setUser(u)
      localStorage.setItem('osiris_user', JSON.stringify(u))
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
    localStorage.setItem('osiris_user', JSON.stringify(data.user))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('osiris_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
