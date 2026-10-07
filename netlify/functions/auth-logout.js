const { makeHeaders, clearSessionCookie } = require('./_auth')

exports.handler = async (event) => {
  const headers = makeHeaders(event, 'POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  return {
    statusCode: 200,
    headers: { ...headers, 'Set-Cookie': clearSessionCookie() },
    body: JSON.stringify({ ok: true }),
  }
}
