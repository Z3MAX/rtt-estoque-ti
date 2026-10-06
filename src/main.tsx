import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { msalInstance } from './lib/msalConfig'
import './index.css'

async function startApp() {
  await msalInstance.initialize()

  // If this window was opened as a popup callback (has auth code/error in URL
  // and has an opener), MSAL handles it internally during initialize().
  // Don't render the app — MSAL will close the popup automatically.
  const hash = window.location.hash
  const search = window.location.search
  const isPopupCallback =
    window.opener != null &&
    (hash.includes('code=') || hash.includes('error=') ||
     search.includes('code=') || search.includes('error='))

  if (isPopupCallback) return

  await msalInstance.handleRedirectPromise().catch(() => {})

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
