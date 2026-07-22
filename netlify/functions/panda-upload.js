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

    // Passo 1: criar o vídeo via REST API — retorna o ID real e a URL de upload
    const pandaBody = { title: title.trim() }
    if (process.env.PANDAVIDEO_FOLDER_ID) pandaBody.folder_id = process.env.PANDAVIDEO_FOLDER_ID

    const pandaRes = await fetch('https://api.pandavideo.com.br/videos', {
      method: 'POST',
      headers: {
        'Authorization': process.env.PANDAVIDEO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pandaBody),
    })

    if (!pandaRes.ok) {
      const errText = await pandaRes.text()
      console.error('Panda Video REST API error:', pandaRes.status, errText)
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Panda Video HTTP ${pandaRes.status}`, detail: errText || '(sem corpo)' }) }
    }

    const data = await pandaRes.json()
    console.log('Panda Video create response:', JSON.stringify(data))

    // A API retorna o ID real do vídeo e a upload_url
    const videoId = data.id || data.video_id
    const uploadUrl = data.upload_url

    if (!videoId || !uploadUrl) {
      console.error('Resposta inesperada da API Panda Video:', JSON.stringify(data))
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Resposta inesperada da API', detail: JSON.stringify(data) }) }
    }

    const playerDomain = process.env.PANDAVIDEO_PLAYER_DOMAIN
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        video_id: videoId,
        upload_url: uploadUrl,
        embed_url: `https://${playerDomain}/embed/?v=${videoId}`,
      }),
    }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('panda-upload error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
