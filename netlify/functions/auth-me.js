const { requireAuth, signToken, makeHeaders, errorResponse, makeSessionCookie } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const payload = requireAuth(event)

    // Emite token renovado com o mesmo prazo de 2h e renova o cookie
    const freshToken = signToken({
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      roles: payload.roles,
      area: payload.area ?? null,
      mustChangePassword: payload.mustChangePassword ?? false,
      tokenVersion: payload.tokenVersion,
    })

    return {
      statusCode: 200,
      headers: { ...headers, 'Set-Cookie': makeSessionCookie(freshToken) },
      body: JSON.stringify({
        token: freshToken,
        user: {
          id: payload.userId,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          roles: payload.roles,
          area: payload.area ?? null,
          mustChangePassword: payload.mustChangePassword ?? false,
        },
      }),
    }
  } catch (err) {
    return errorResponse(headers, err)
  }
}
