import { Users, Search, X, Mail, Building2, Briefcase, Calendar, Award, UserCheck, Pencil, Camera, Upload, Trash2, RefreshCw, FileText } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { api } from '../../../lib/api'
import type { Colaborador } from '../../../lib/types'
import { NIVEL_LABELS } from '../../../lib/types'
import { useAuth } from '../../../lib/auth'

// ── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function initials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function formatDate(dateStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function calcAge(dateStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  if (today.getMonth() - d.getMonth() < 0 || (today.getMonth() - d.getMonth() === 0 && today.getDate() < d.getDate())) age--
  return age
}
function tempoNaEmpresa(dateStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 1) return 'menos de 1 mês'
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years} ano${years > 1 ? 's' : ''}` : `${years} ano${years > 1 ? 's' : ''} e ${rem} mês${rem > 1 ? 'es' : ''}`
}
function isAdminRole(role?: string) {
  if (!role) return false
  return ['Administrador de RH', 'Administrador de TI', 'Administrador Master', 'Administrador de RH / Gestor'].includes(role)
}
function toInputDate(dateStr?: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}
function compressImage(file: File, maxPx = 300, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

const NIVEIS = Object.entries(NIVEL_LABELS) as [string, string][]

// ── AvatarImg (card + modal) ─────────────────────────────────────────────────
function ColabAvatar({ colab, size = 'md' }: { colab: Colaborador; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-24 h-24 text-3xl rounded-2xl' : size === 'md' ? 'w-12 h-12 text-base rounded-full' : 'w-9 h-9 text-sm rounded-full'
  const color = avatarColor(colab.nome)
  if (colab.photo_url) {
    return <img src={colab.photo_url} alt={colab.nome} className={`${sz} object-cover border-4 border-white dark:border-slate-800 shadow-lg`} />
  }
  return (
    <div className={`${sz} ${color} text-white flex items-center justify-center font-bold border-4 border-white dark:border-slate-800 shadow-lg shrink-0`}>
      {initials(colab.nome)}
    </div>
  )
}

// ── Edit Modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  colab: Colaborador
  token: string
  onClose: () => void
  onSaved: (updated: Colaborador) => void
}
function EditProfileModal({ colab, token, onClose, onSaved }: EditModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    nome: colab.nome,
    cargo: colab.cargo ?? '',
    nivel: colab.nivel ?? '',
    area: colab.area ?? '',
    email: colab.email ?? '',
    gestor_nome: colab.gestor_nome ?? '',
    bio: colab.bio ?? '',
    data_nascimento: toInputDate(colab.data_nascimento),
    data_admissao: toInputDate(colab.data_admissao),
  })
  const [photo, setPhoto] = useState<string | null>(colab.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoErr, setPhotoErr] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setPhotoErr('Selecione uma imagem válida.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoErr('Máximo 5 MB.'); return }
    setPhotoErr('')
    const compressed = await compressImage(file)
    if (compressed.length > 200_000) { setPhotoErr('Imagem muito grande após compressão.'); return }
    setPhoto(compressed)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        cargo: form.cargo || null,
        nivel: form.nivel || null,
        area: form.area || null,
        email: form.email || null,
        gestor_nome: form.gestor_nome || null,
        bio: form.bio || null,
        data_nascimento: form.data_nascimento || null,
        data_admissao: form.data_admissao || null,
        photo_url: photo,
      }
      const updated = await api.colaboradores.update(colab.id, payload)
      onSaved({ ...colab, ...updated } as Colaborador)
      onClose()
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500'
  const label = 'text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Editar perfil — {colab.nome.split(' ')[0]}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={16} />
          </button>
        </div>

        {/* Body scrollável */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Foto */}
          <div>
            <span className={label}>Foto</span>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="relative shrink-0">
                {photo ? (
                  <img src={photo} alt="preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-600" />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl ${avatarColor(colab.nome)} flex items-center justify-center text-white text-2xl font-bold border-2 border-slate-200 dark:border-slate-600`}>
                    {initials(colab.nome)}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-colors"
                  title="Trocar foto"
                >
                  <Camera size={13} />
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
              >
                <Upload size={18} className="text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Arraste ou <span className="text-primary-600 font-medium">clique para selecionar</span>
                </p>
                <p className="text-[10px] text-slate-400">JPG, PNG · máx. 5 MB</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            {photo && (
              <button onClick={() => setPhoto(null)} className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                <Trash2 size={12} /> Remover foto
              </button>
            )}
            {photoErr && <p className="text-xs text-red-500 mt-1">{photoErr}</p>}
          </div>

          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label}>Nome completo</label>
              <input className={field} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Cargo</label>
              <input className={field} value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Analista de RH" />
            </div>
            <div>
              <label className={label}>Nível</label>
              <select className={field} value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}>
                <option value="">— selecione —</option>
                {NIVEIS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Área / Departamento</label>
              <input className={field} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Ex: Recursos Humanos" />
            </div>
            <div>
              <label className={label}>Gestor direto</label>
              <input className={field} value={form.gestor_nome} onChange={e => setForm(f => ({ ...f, gestor_nome: e.target.value }))} placeholder="Nome do gestor" />
            </div>
            <div>
              <label className={label}>E-mail</label>
              <input className={field} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div>
              <label className={label}>Data de nascimento</label>
              <input className={field} type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={label}>Data de admissão (tempo de empresa)</label>
              <input className={field} type="date" value={form.data_admissao} onChange={e => setForm(f => ({ ...f, data_admissao: e.target.value }))} />
            </div>
          </div>

          {/* Mini-CV / Bio */}
          <div>
            <label className={label}>Mini-CV / Apresentação</label>
            <textarea
              className={`${field} resize-none`}
              rows={4}
              placeholder="Formação, experiências anteriores, especializações..."
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? <><RefreshCw size={14} className="animate-spin" />Salvando...</> : 'Salvar perfil'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Modal ────────────────────────────────────────────────────────────
interface ProfileModalProps {
  colab: Colaborador
  canEdit: boolean
  token: string
  onClose: () => void
  onEdited: (updated: Colaborador) => void
}
function ProfileModal({ colab, canEdit, token, onClose, onEdited }: ProfileModalProps) {
  const [editing, setEditing] = useState(false)
  const color = avatarColor(colab.nome)
  const age = calcAge(colab.data_nascimento)
  const nascimento = formatDate(colab.data_nascimento)
  const nivel = colab.nivel ? NIVEL_LABELS[colab.nivel] : null
  const tempo = tempoNaEmpresa(colab.data_admissao || colab.created_at)

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header colorido */}
        <div className={`${color} px-6 pt-8 pb-16 relative`}>
          <div className="flex items-center justify-end gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
              >
                <Pencil size={13} /> Editar perfil
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Avatar sobreposto */}
        <div className="px-6 -mt-12">
          {colab.photo_url ? (
            <img
              src={colab.photo_url}
              alt={colab.nome}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-lg"
            />
          ) : (
            <div className={`w-24 h-24 rounded-2xl ${color} text-white flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg`}>
              {initials(colab.nome)}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="px-6 pt-3 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Nome e cargo */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{colab.nome}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {colab.cargo && <span className="text-sm text-slate-500 dark:text-slate-400">{colab.cargo}</span>}
              {nivel && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium">{nivel}</span>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {colab.bio && (
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Mini-CV</p>
                <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-line leading-relaxed">{colab.bio}</p>
              </div>
            </div>
          )}

          {/* Infos grid */}
          <div className="space-y-3">
            {colab.area && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Building2 size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Área</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{colab.area}</p>
                </div>
              </div>
            )}

            {colab.gestor_nome && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <UserCheck size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Gestor</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{colab.gestor_nome}</p>
                </div>
              </div>
            )}

            {colab.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">E-mail</p>
                  <a href={`mailto:${colab.email}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline truncate block">
                    {colab.email}
                  </a>
                </div>
              </div>
            )}

            {colab.data_nascimento && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Calendar size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Nascimento</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">
                    {nascimento}{age !== null ? ` · ${age} anos` : ''}
                  </p>
                </div>
              </div>
            )}

            {tempo && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Briefcase size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Tempo na empresa</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{tempo}</p>
                </div>
              </div>
            )}

            {(colab.total_avaliacoes ?? 0) > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Award size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Avaliações concluídas</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">{colab.total_avaliacoes}</p>
                </div>
              </div>
            )}
          </div>

          {colab.email && (
            <a
              href={`mailto:${colab.email}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            >
              <Mail size={14} /> Enviar e-mail
            </a>
          )}
        </div>
      </div>
    </div>

    {editing && (
      <EditProfileModal
        colab={colab}
        token={token}
        onClose={() => setEditing(false)}
        onSaved={updated => { onEdited(updated); setEditing(false) }}
      />
    )}
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EquipePage() {
  const { user, token } = useAuth()
  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterCargo, setFilterCargo] = useState('')
  const [selected, setSelected] = useState<Colaborador | null>(null)

  const canEdit = isAdminRole(user?.role)

  function fetchColabs() {
    setLoading(true); setError(false)
    api.colaboradores.list()
      .then(all => setColabs(all as Colaborador[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchColabs() }, [])
  useEffect(() => {
    if (!selected) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected])

  function handleEdited(updated: Colaborador) {
    setColabs(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  const areas = [...new Set(colabs.map(c => c.area).filter(Boolean))] as string[]
  const cargos = [...new Set(colabs.map(c => c.cargo).filter(Boolean))] as string[]
  const filtered = colabs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || c.nome.toLowerCase().includes(q) || (c.cargo ?? '').toLowerCase().includes(q)
    const matchArea = !filterArea || c.area === filterArea
    const matchCargo = !filterCargo || c.cargo === filterCargo
    return matchSearch && matchArea && matchCargo
  })

  const sel = 'py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <>
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Minha Equipe</h1>
        <p className="text-sm text-slate-400 mt-0.5">Colaboradores{user?.area ? ` da área ${user.area}` : ''}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
        </div>
        {areas.length > 0 && (
          <select className={sel} value={filterArea} onChange={e => setFilterArea(e.target.value)}>
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {cargos.length > 0 && (
          <select className={sel} value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
            <option value="">Todos os cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
          <Users size={32} className="opacity-40" />
          <p className="text-sm">Erro ao carregar colaboradores. Tente novamente.</p>
          <button onClick={fetchColabs} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-3 text-center hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              {c.photo_url ? (
                <img src={c.photo_url} alt={c.nome} className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700" />
              ) : (
                <div className={`w-14 h-14 rounded-full ${avatarColor(c.nome)} text-white flex items-center justify-center text-lg font-bold shrink-0`}>
                  {initials(c.nome)}
                </div>
              )}
              <div className="w-full">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{c.nome}</p>
                {c.cargo && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.cargo}</p>}
                {c.area && <p className="text-[11px] text-slate-300 dark:text-slate-500 mt-0.5 line-clamp-1">{c.area}</p>}
              </div>
              <span className="text-[11px] text-primary-500 font-medium">Ver perfil →</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Users size={32} className="opacity-40" />
              <p className="text-sm">Nenhum colaborador encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>

    {selected && (
      <ProfileModal
        colab={selected}
        canEdit={canEdit}
        token={token ?? ''}
        onClose={() => setSelected(null)}
        onEdited={handleEdited}
      />
    )}
    </>
  )
}
