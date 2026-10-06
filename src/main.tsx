import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { handleMsalRedirect } from './lib/msalConfig'
import './index.css'

async function startApp() {
  // Handle Microsoft redirect response (runs after login redirect returns)
  const msResult = await handleMsalRedirect()

  if (msResult?.idToken) {
    // Exchange Microsoft token for our JWT and store it before rendering
    try {
      const res = await fetch('/.netlify/functions/auth-microsoft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: msResult.idToken,
          accessToken: msResult.accessToken || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        localStorage.setItem('osiris_token', data.token)
        localStorage.setItem('osiris_user', JSON.stringify(data.user))
        localStorage.removeItem('rtt_portal')
      } else {
        // Store error so LoginPage can show it
        sessionStorage.setItem('ms_login_error', data.error || 'Erro ao autenticar com Microsoft')
      }
    } catch {
      sessionStorage.setItem('ms_login_error', 'Erro de conexão ao autenticar com Microsoft')
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  )
}

startApp()
