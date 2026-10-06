import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { msalInstance } from './lib/msalConfig'
import './index.css'

async function startApp() {
  await msalInstance.initialize()

  // Detect MSAL auth callback by URL hash/query — code= or error= only come
  // from Microsoft's OAuth redirect, so it's safe to intercept unconditionally.
  const hash = window.location.hash
  const search = window.location.search
  const isMsalCallback =
    hash.includes('code=') || hash.includes('error=') ||
    search.includes('code=') || search.includes('error=')

  if (isMsalCallback) {
    // Let MSAL process the token and communicate to the opener
    await msalInstance.handleRedirectPromise().catch(() => {})
    // Close if opened as popup; otherwise redirect home
    if (window.opener) {
      window.close()
    } else {
      window.location.replace('/')
    }
    return
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
