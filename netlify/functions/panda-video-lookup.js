const { requireAuth, makeHeaders } = require('./_auth')

// Após o upload via Tus, busca o ID real do vídeo no Panda Video pelo título.
// O Panda Video ignora o video_id que passamos no Upload-Metadata e atribui o próprio.

exports.handler = async (event) => {
  const headers = makeHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const missingEnv = ['PANDAVIDEO_API_KEY', 'PANDAVIDEO_PLAYER_DOMAIN'].find(k => !process.env[k])
  if (missingEnv) return { statusCode: 500, headers, body: JSON.stringify({ error: `${missingEnv} não configurado` }) }

  try {
    requireAuth(event)

    const title = (event.queryStringParameters || {}).title
    if (!title) return { statusCode: 400, headers, body: JSON.stringify({ error: 'title é obrigatório' }) }

    // Tenta GET /videos com a chave sem Bearer (padrão Panda Video)
    const res = await fetch(`https://api.pandavideo.com.br/videos?title=${encodeURIComponent(title)}&per_page=10`, {
      headers: { 'Authorization': process.env.PANDAVIDEO_API_KEY },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('panda-video-lookup error:', res.status, errText)
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Panda Video HTTP ${res.status}`, detail: errText }) }
    }

    const data = await res.json()
    // A API pode retornar { data: [...] } ou array direto
    const videos = Array.isArray(data) ? data : (data.data || data.videos || [])

    // Encontra o vídeo com o título mais próximo (exato primeiro, depois parcial)
    const normalizedTitle = title.trim().toLowerCase()
    const video =
      videos.find(v => (v.title || '').trim().toLowerCase() === normalizedTitle) ||
      videos.find(v => (v.title || '').trim().toLowerCase().includes(normalizedTitle)) ||
      videos[0]

    if (!video) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Vídeo não encontrado no Panda Video' }) }
    }

    const videoId = video.id || video.video_id
    const playerDomain = process.env.PANDAVIDEO_PLAYER_DOMAIN
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        video_id: videoId,
        embed_url: `https://${playerDomain}/embed/?v=${videoId}`,
      }),
    }
  } catch (err) {
    if (err.statusCode) return { statusCode: err.statusCode, headers, body: JSON.stringify({ error: err.message }) }
    console.error('panda-video-lookup error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno' }) }
  }
}
