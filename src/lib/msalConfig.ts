import { PublicClientApplication, Configuration } from '@azure/msal-browser'

const TENANT_ID = '3ba4e9dd-629e-4004-9c62-708d327b58a5'
const CLIENT_ID = '1f8f742a-3544-4370-ae68-986ef41eba45'

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

export async function loginWithMicrosoft(): Promise<{ idToken: string; email: string; name: string }> {
  await msalInstance.initialize()

  const result = await msalInstance.loginPopup(loginRequest)

  const account = result.account
  const idToken = result.idToken

  const email = account.username // Microsoft uses username as UPN (email)
  const name = account.name ?? email

  return { idToken, email, name }
}
