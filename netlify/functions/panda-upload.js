const { requireAuth, isAdminRole, makeHeaders } = require('./_auth')

// Env vars needed in Netlify dashboard:
//   PANDAVIDEO_API_KEY       — chave de API do Panda Video
//   PANDAVIDEO_FOLDER_ID     — ID da pasta (opcional)
//   PANDAVIDEO_PLAYER_DOMAIN — domínio do player (ex: player-vz-XXXX.tv.pandavideo.com.br)

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const missingEnv = ['PANDAVIDEO_API_KEY', 'PANDAVIDEO_PLAYER_DOMAIN'].find(k => !process.env[k])
  if (missingEnv) return { statusCode: 500, headers, body: JSON.stringify({ error: `${missingEnv} não configurado` }) }

  try {
    const auth = requireAuth(event)

    const adminRoles = ['Administrador de RH', 'Administrador de TI', 'Administrador Master', 'Administrador de RH / Gestor']
    const isInst = Array.isArray(auth.roles) && auth.roles.includes('instrutor')
    if (!adminRoles.includes(auth.role) && !isInst) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem permissão para fazer upload' }) }
    }

    const { title, fileSize } = JSON.parse(event.body || '{}')
    if (!title || !title.trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: 'title é obrigatório' }) }
    if (!fileSize || typeof fileSize !== 'number') return { statusCode: 400, headers, body: JSON.stringify({ error: 'fileSize é obrigatório' }) }

    // Upload-Metadata: pares chave/valor com todos os valores em Base64
    const b64 = (str) => Buffer.from(String(str)).toString('base64')
    const metaParts = [
      `authorization ${b64(process.env.PANDAVIDEO_API_KEY)}`,
      `filename ${b64(title.trim())}`,
      `filetype ${b64('video')}`,
    ]
    if (process.env.PANDAVIDEO_FOLDER_ID) {
      metaParts.push(`folder_id ${b64(process.env.PANDAVIDEO_FOLDER_ID)}`)
    }

    // POST Tus: cria o recurso de upload e obtém a URL de destino (Location header)
    const uploaderRes = await fetch('https://uploader-us01.pandavideo.com.br/files/', {
      method: 'POST',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': metaParts.join(','),
        'Content-Length': '0',
      },
    })

    if (!uploaderRes.ok) {
      const errText = await uploaderRes.text()
      console.error('Panda Video uploader error:', uploaderRes.status, errText)
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Panda Video HTTP ${uploaderRes.status}`, detail: errText || '(sem corpo)' }) }
    }

    const uploadUrl = uploaderRes.headers.get('location')
    if (!uploadUrl) {
      console.error('Panda Video: sem Location header. Status:', uploaderRes.status)
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Panda Video não retornou URL de upload' }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ upload_url: uploadUrl }),
    }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('panda-upload error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
