import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { msalInstance } from './lib/msalConfig'
import './index.css'

// Initialize MSAL before rendering so the popup can detect and handle
// the auth code redirect (closes itself automatically after login)
msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().catch(() => {})

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  )
})
