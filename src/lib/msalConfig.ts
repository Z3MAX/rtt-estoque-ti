import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-browser'

const TENANT_ID = import.meta.env.VITE_MS_TENANT_ID as string
const CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID as string

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
