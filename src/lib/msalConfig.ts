import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-browser'

const TENANT_ID = import.meta.env.VITE_MS_TENANT_ID || '3ba4e9dd-629e-4004-9c62-708d327b58a5'
const CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID || '1f8f742a-3544-4370-ae68-986ef41eba45'

const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

// Redirects the whole page to Microsoft login (more reliable than popup)
export async function loginWithMicrosoft(): Promise<void> {
  await msalInstance.initialize()
  await msalInstance.loginRedirect(loginRequest)
}

// Called at app startup — resolves the redirect response if returning from Microsoft
export async function handleMsalRedirect(): Promise<AuthenticationResult | null> {
  await msalInstance.initialize()
  return msalInstance.handleRedirectPromise().catch(() => null)
}
