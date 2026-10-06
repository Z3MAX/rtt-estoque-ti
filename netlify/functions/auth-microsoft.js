const { neon } = require('@neondatabase/serverless')
const { createRemoteJWKSet, jwtVerify } = require('jose')
const { signToken, makeHeaders, errorResponse } = require('./_auth')

const TENANT_ID = process.env.MS_TENANT_ID || '3ba4e9dd-629e-4004-9c62-708d327b58a5'
const CLIENT_ID = process.env.MS_CLIENT_ID || '1f8f742a-3544-4370-ae68-986ef41eba45'

// Microsoft's public keys endpoint (cached at module level by jose)
const JWKS = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`)
)

async function fetchMsProfilePhoto(accessToken) {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  if (!process.env.DATABASE_URL) return { statusCode: 500, headers, body: JSON.stringify({ error: 'DATABASE_URL not configured' }) }

  let idToken, accessToken
  try {
    const body = JSON.parse(event.body || '{}')
    idToken = body.idToken
    accessToken = body.accessToken || null
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) }
  }

  if (!idToken) return { statusCode: 400, headers, body: JSON.stringify({ error: 'idToken obrigatório' }) }

  try {
    // Validate the Microsoft ID token signature and claims
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: [
        `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        `https://sts.windows.net/${TENANT_ID}/`,
      ],
      audience: CLIENT_ID,
    })

    const msEmail = (payload.preferred_username || payload.email || payload.upn || '').toLowerCase().trim()
    if (!msEmail) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Não foi possível obter o e-mail da conta Microsoft' }) }

    const sql = neon(process.env.DATABASE_URL)

    const rows = await sql`
      SELECT id, name, email, role, roles, area, active, must_change_password, photo_url
      FROM users
      WHERE LOWER(TRIM(email)) = ${msEmail}
    `

    if (rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Usuário ${msEmail} não está cadastrado no sistema. Contate o administrador.` }),
      }
    }

    const user = rows[0]

    if (!user.active) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Usuário desativado. Contate o administrador.' }) }
    }

    // Fetch and update Microsoft profile photo (best-effort, non-blocking auth)
    let photoUrl = user.photo_url || null
    if (accessToken) {
      const msPhoto = await fetchMsProfilePhoto(accessToken)
      if (msPhoto) {
        photoUrl = msPhoto
        await sql`UPDATE users SET photo_url = ${msPhoto} WHERE id = ${user.id}`
      }
    }

    const tokenPayload = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
      area: user.area || null,
      mustChangePassword: user.must_change_password ?? false,
    }

    const token = signToken(tokenPayload)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roles: user.roles || [user.role],
          area: user.area || null,
          mustChangePassword: user.must_change_password ?? false,
          photo_url: photoUrl,
        },
      }),
    }
  } catch (err) {
    if (err.code === 'ERR_JWT_EXPIRED') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sessão Microsoft expirada. Tente novamente.' }) }
    }
    if (err.code?.startsWith('ERR_JWT') || err.code?.startsWith('ERR_JWS')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token Microsoft inválido.' }) }
    }
    return errorResponse(headers, err)
  }
}
