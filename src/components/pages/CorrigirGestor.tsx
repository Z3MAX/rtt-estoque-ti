import { useState } from 'react'
import { Search, RefreshCw, CheckCircle2, AlertCircle, UserCog } from 'lucide-react'
import { api } from '../../lib/api'
import type { Colaborador } from '../../lib/types'

export default function CorrigirGestorPage() {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Colaborador[]>([])
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [buscou, setBuscou] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [resultado, setResultado] = useState<{ ok: number; erro: number } | null>(null)
  const [erro, setErro] = useState('')

  async function buscar() {
    if (!busca.trim()) return
    setLoading(true)
    setErro('')
    setResultado(null)
    try {
      const rows = await api.colaboradores.list(busca.trim())
      const termo = busca.trim().toLowerCase()
      const filtrados = rows.filter(c => (c.gestor_nome ?? '').toLowerCase().includes(termo))
      setResultados(filtrados)
      setSelecionados(new Set())
      setBuscou(true)
    } catch (err: any) {
      setErro(err.message || 'Erro ao buscar')
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: number) {
    setSelecionados(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodos() {
    setSelecionados(prev => prev.size === resultados.length ? new Set() : new Set(resultados.map(c => c.id)))
  }

  async function aplicar() {
    if (selecionados.size === 0 || !novoNome.trim()) return
    setAplicando(true)
    setErro('')
    let ok = 0, falhas = 0
    for (const id of selecionados) {
      const c = resultados.find(r => r.id === id)
      if (!c) continue
      try {
        await api.colaboradores.update(id, {
          nome: c.nome,
          cargo: c.cargo,
          nivel: c.nivel,
          area: c.area,
          email: c.email,
          gestor_nome: novoNome.trim(),
          gestor_email: novoEmail.trim() || undefined,
          data_nascimento: c.data_nascimento,
          data_admissao: c.data_admissao,
          photo_url: c.photo_url,
          bio: c.bio,
        })
        ok++
      } catch {
        falhas++
      }
    }
    setResultado({ ok, erro: falhas })
    setAplicando(false)
    buscar()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Corrigir vínculo de gestor</h1>
        <p className="text-sm text-slate-400">
          Encontre colaboradores cujo campo "Gestor responsável" não bate com o nome exato da conta do gestor (o que faz o gestor não ver seu time em "Realizar Avaliação"), e corrija em lote.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Buscar por texto no campo Gestor (ex: valteir)"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <button
          onClick={buscar}
          disabled={loading || !busca.trim()}
          className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}Buscar
        </button>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl">
          <AlertCircle size={13} />{erro}
        </div>
      )}

      {buscou && resultados.length === 0 && !loading && (
        <p className="text-sm text-slate-400">Nenhum colaborador encontrado com esse texto no campo Gestor.</p>
      )}

      {resultados.length > 0 && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-2.5 px-4 w-8">
                    <input type="checkbox" checked={selecionados.size === resultados.length} onChange={toggleTodos} />
                  </th>
                  <th className="text-left py-2.5 px-3">Colaborador</th>
                  <th className="text-left py-2.5 px-3">Área</th>
                  <th className="text-left py-2.5 px-3">Gestor atual (texto)</th>
                  <th className="text-left py-2.5 px-3">E-mail do gestor atual</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 px-4">
                      <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{c.nome}</p>
                      <p className="text-xs text-slate-400">{c.cargo || '—'}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{c.area || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{c.gestor_nome || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">{c.gestor_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <UserCog size={15} />Corrigir {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''} para:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome exato do gestor (igual à conta)</label>
                <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Valteir Lacerda" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">E-mail do gestor (opcional)</label>
                <input value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="gestor@rematiptop.com.br" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <button
              onClick={aplicar}
              disabled={aplicando || selecionados.size === 0 || !novoNome.trim()}
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {aplicando ? <><RefreshCw size={14} className="animate-spin" />Aplicando...</> : `Aplicar correção (${selecionados.size})`}
            </button>
            {resultado && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={13} />{resultado.ok} corrigido{resultado.ok !== 1 ? 's' : ''} com sucesso{resultado.erro > 0 ? `, ${resultado.erro} com erro` : ''}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
