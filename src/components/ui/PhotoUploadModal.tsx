import { useRef, useState } from 'react'
import { X, Camera, Upload, Trash2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../lib/auth'

interface Props {
  onClose: () => void
}

function compressImage(file: File, maxPx = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function PhotoUploadModal({ onClose }: Props) {
  const { user, updateUser, token } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(user?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Selecione uma imagem válida.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB.'); return }
    setError('')
    const compressed = await compressImage(file)
    setPreview(compressed)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photo_url: preview }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      updateUser({ photo_url: preview })
      onClose()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)
    try {
      const res = await fetch('/.netlify/functions/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photo_url: null }),
      })
      if (!res.ok) throw new Error()
      updateUser({ photo_url: null })
      onClose()
    } catch {
      setError('Não foi possível remover. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const changed = preview !== (user?.photo_url ?? null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Foto de perfil</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {preview ? (
                <img src={preview} alt="preview" className="w-28 h-28 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/40" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary-600 flex items-center justify-center ring-4 ring-primary-100 dark:ring-primary-900/40">
                  <span className="text-4xl font-bold text-white">
                    {user?.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg transition-colors"
                title="Trocar foto"
              >
                <Camera size={15} />
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
          >
            <Upload size={20} className="text-slate-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Arraste uma imagem ou <span className="text-primary-600 font-medium">clique para selecionar</span>
            </p>
            <p className="text-[10px] text-slate-400">JPG, PNG ou WEBP · máx. 5 MB</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {user?.photo_url && (
            <button
              onClick={remove}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />Remover
            </button>
          )}
          <button
            onClick={save}
            disabled={!changed || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? <><RefreshCw size={14} className="animate-spin" />Salvando...</> : 'Salvar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
