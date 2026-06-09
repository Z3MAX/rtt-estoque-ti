const jwt = require('jsonwebtoken')

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw Object.assign(new Error('JWT_SECRET não configurado'), { statusCode: 500 })
  }
  return process.env.JWT_SECRET
}

/** Verifica JWT no header Authorization: Bearer <token>. Retorna o payload. */
function requireAuth(event) {
  const headers = event.headers || {}
  const authHeader = headers.authorization || headers.Authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Não autenticado'), { statusCode: 401 })
  }
  const token = authHeader.slice(7)
  try {
    return jwt.verify(token, getSecret())
  } catch {
    throw Object.assign(new Error('Sessão expirada. Faça login novamente.'), { statusCode: 401 })
  }
}

/** Retorna true para roles com acesso administrativo completo. */
function isAdminRole(role) {
  return role === 'Administrador de RH' || role === 'Administrador de TI'
}

/** Como requireAuth, mas exige role de administrador. */
function requireAdmin(event) {
  const payload = requireAuth(event)
  if (!isAdminRole(payload.role)) {
    throw Object.assign(new Error('Acesso negado'), { statusCode: 403 })
  }
  return payload
}

/** Assina um JWT com 8h de validade. */
function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '8h' })
}

/** Gera os headers CORS/Content-Type padronizados. */
function makeHeaders(event, methods = 'GET, POST, PUT, DELETE, OPTIONS') {
  const siteUrl = process.env.SITE_URL || ''
  const origin = (event && event.headers && (event.headers.origin || event.headers.Origin)) || ''
  const allowOrigin = siteUrl ? (origin === siteUrl ? origin : siteUrl) : (origin || '*')
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': methods,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

/** Monta resposta de erro a partir de uma exceção.
 *  Erros com err.statusCode são retornados com sua mensagem (controlada).
 *  Erros internos são logados e retornam mensagem genérica. */
function errorResponse(headers, err) {
  console.error('[error]', err.message, err.stack || '')
  const status = err.statusCode || 500
  const message = err.statusCode ? err.message : 'Erro interno do servidor'
  return { statusCode: status, headers, body: JSON.stringify({ error: message }) }
}

module.exports = { requireAuth, requireAdmin, isAdminRole, signToken, makeHeaders, errorResponse }
