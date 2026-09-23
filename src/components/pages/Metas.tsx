import { useState, useEffect, useCallback } from 'react'
import {
  Target, Plus, ChevronDown, ChevronUp, Save, Send,
  CheckCircle2, Clock, FileEdit, Trash2, AlertCircle,
  TrendingUp, Info,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth, isAdmin, isGestor } from '../../lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaItem {
  id?: number
  tipo: 'coletiva' | 'individual'
  descricao: string | null
  metrica_s1: string | null
  metrica_s2: string | null
  peso: number
  pct_s1: number | null
  pct_s2: number | null
  ordem: number
}

interface Meta {
  id: number
  colaborador_id: number | null
  colaborador_nome: string | null
  gestor_nome: string | null
  cargo: string | null
  data_admissao: string | null
  data_ultima_promocao: string | null
  categoria: string
  ano: number
  status: 'rascunho' | 'enviado' | 'aprovado'
  criado_por: number
  created_at: string
  updated_at: string
  itens: MetaItem[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { value: '1.5_limitado',  label: '1,5 Salário — Limitado',    elegColetiva: 1, elegIndividual: 0.5 },
  { value: '1.5_ilimitado', label: '1,5 Salário — Ilimitado',   elegColetiva: 1, elegIndividual: 0.5 },
  { value: '2_limitado',    label: '2 Salários — Limitado',     elegColetiva: 1, elegIndividual: 1.0 },
  { value: '2_ilimitado',   label: '2 Salários — Ilimitado',    elegColetiva: 1, elegIndividual: 1.0 },
]

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho',  icon: FileEdit,     color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
  enviado:  { label: 'Enviado',   icon: Clock,        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
  aprovado: { label: 'Aprovado',  icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcBonus(item: MetaItem, semestre: 1 | 2): number {
  const pct = semestre === 1 ? item.pct_s1 : item.pct_s2
  if (pct === null || pct === undefined) return 0
  return item.peso * (pct / 100)
}

function totalBonus(itens: MetaItem[], semestre: 1 | 2): number {
  return itens.reduce((sum, it) => sum + calcBonus(it, semestre), 0)
}

function getCatInfo(catKey: string) {
  return CATEGORIAS.find(c => c.value === catKey) || CATEGORIAS[0]
}

// ─── MetaForm ────────────────────────────────────────────────────────────────

function MetaForm({
  initial, onSaved, onCancel, canApprove, canEvaluar,
}: {
  initial: Meta | null
  onSaved: (m: Meta) => void
  onCancel: () => void
  canApprove: boolean
  canEvaluar: boolean
}) {
  const { user } = useAuth()
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [catKey, setCatKey]       = useState(initial?.categoria || '1.5_limitado')
  const [colaborador, setColab]   = useState(initial?.colaborador_nome || user?.name || '')
  const [gestor, setGestor]       = useState(initial?.gestor_nome || '')
  const [cargo, setCargo]         = useState(initial?.cargo || '')
  const [dataAdm, setDataAdm]     = useState(initial?.data_admissao || '')
  const [dataPromo, setDataPromo] = useState(initial?.data_ultima_promocao || '')
  const [itens, setItens]         = useState<MetaItem[]>(() => {
    if (initial?.itens?.length) return initial.itens
    // Default: 1 coletiva + 3 individual
    const cat = getCatInfo(catKey)
    return [
      {
        tipo: 'coletiva', ordem: 0, peso: cat.elegColetiva, pct_s1: null, pct_s2: null,
        descricao: 'Faturamento Líquido do Grupo Rema Tip Top Brasil (no Lucanet) em K-BRL',
        metrica_s1: 'Atingir a meta de faturamento coletiva do 1º semestre',
        metrica_s2: 'Atingir a meta de faturamento coletiva do ano',
      },
      ...Array.from({ length: 3 }, (_, i) => ({
        tipo: 'individual' as const, ordem: i + 1,
        peso: parseFloat((cat.elegIndividual / 3).toFixed(6)),
        pct_s1: null, pct_s2: null,
        descricao: null, metrica_s1: null, metrica_s2: null,
      })),
    ]
  })

  const cat        = getCatInfo(catKey)
  const isApproved = initial?.status === 'aprovado'
  const canEdit    = !isApproved || canApprove
  const individuals = itens.filter(it => it.tipo === 'individual')
  const coletiva    = itens.find(it => it.tipo === 'coletiva')

  // When category changes, redistribute individual pesos
  function handleCatChange(newCat: string) {
    setCatKey(newCat)
    const info = getCatInfo(newCat)
    setItens(prev => prev.map(it => {
      if (it.tipo === 'coletiva') return { ...it, peso: info.elegColetiva }
      const count = prev.filter(x => x.tipo === 'individual').length || 1
      return { ...it, peso: parseFloat((info.elegIndividual / count).toFixed(6)) }
    }))
  }

  function addGoal() {
    const count = individuals.length + 1
    const info  = getCatInfo(catKey)
    const peso  = parseFloat((info.elegIndividual / count).toFixed(6))
    setItens(prev => {
      const newItens = prev.map(it =>
        it.tipo === 'individual' ? { ...it, peso } : it
      )
      return [
        ...newItens,
        { tipo: 'individual', ordem: newItens.length, peso, pct_s1: null, pct_s2: null, descricao: null, metrica_s1: null, metrica_s2: null },
      ]
    })
  }

  function removeGoal(idx: number) {
    setItens(prev => {
      const withoutRemoved = prev.filter((it, i) => !(it.tipo === 'individual' && i === idx + prev.filter(x => x.tipo === 'coletiva').length))
      const count = withoutRemoved.filter(x => x.tipo === 'individual').length || 1
      const info  = getCatInfo(catKey)
      return withoutRemoved.map(it =>
        it.tipo === 'individual' ? { ...it, peso: parseFloat((info.elegIndividual / count).toFixed(6)) } : it
      )
    })
  }

  function updateItem(idx: number, field: keyof MetaItem, value: any) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function handleSave(newStatus?: string) {
    setSaving(true)
    setError(null)
    try {
      const payload: any = {
        colaborador_nome: colaborador,
        gestor_nome: gestor,
        cargo,
        data_admissao: dataAdm || null,
        data_ultima_promocao: dataPromo || null,
        categoria: catKey,
        itens,
      }
      if (newStatus) payload.status = newStatus

      let saved: Meta
      if (initial) {
        saved = await api.metas.update(initial.id, payload)
      } else {
        saved = await api.metas.create(payload)
      }
      onSaved(saved)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalS1 = totalBonus(itens, 1)
  const totalS2 = totalBonus(itens, 2)
  const hasEval = itens.some(it => it.pct_s1 !== null || it.pct_s2 !== null)

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Colaborador</label>
          <input
            value={colaborador}
            onChange={e => setColab(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gestor</label>
          <input
            value={gestor}
            onChange={e => setGestor(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Cargo</label>
          <input
            value={cargo}
            onChange={e => setCargo(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Categoria de Bônus</label>
          <select
            value={catKey}
            onChange={e => handleCatChange(e.target.value)}
            disabled={!canApprove && !(!initial)}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
          >
            {CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Data de Admissão</label>
          <input
            type="date"
            value={dataAdm}
            onChange={e => setDataAdm(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Última Promoção</label>
          <input
            type="date"
            value={dataPromo}
            onChange={e => setDataPromo(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Elegibility summary */}
      <div className="flex flex-wrap gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Categoria:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.label}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Bônus total:</span>
          <span className="font-semibold text-primary-600 dark:text-primary-400">{cat.elegColetiva + cat.elegIndividual} salário{cat.elegColetiva + cat.elegIndividual !== 1 ? 's' : ''}</span>
        </div>
        {hasEval && (
          <>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">S1 apurado:</span>
              <span className={`font-semibold ${totalS1 >= cat.elegColetiva + cat.elegIndividual * 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalS1.toFixed(2)} sal.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">S2 apurado:</span>
              <span className={`font-semibold ${totalS2 >= cat.elegColetiva + cat.elegIndividual * 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalS2.toFixed(2)} sal.
              </span>
            </div>
          </>
        )}
      </div>

      {/* Collective goal */}
      {coletiva && (
        <div className="border border-primary-200 dark:border-primary-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 flex items-center gap-2">
            <Target size={14} className="text-primary-500" />
            <span className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wide">Meta Coletiva</span>
            <span className="ml-auto text-xs text-primary-500">{coletiva.peso} salário</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">{coletiva.descricao}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Métrica 1º Semestre</label>
                <input
                  value={coletiva.metrica_s1 || ''}
                  onChange={e => updateItem(itens.indexOf(coletiva), 'metrica_s1', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Definida pelo RH"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Métrica 2º Semestre</label>
                <input
                  value={coletiva.metrica_s2 || ''}
                  onChange={e => updateItem(itens.indexOf(coletiva), 'metrica_s2', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Definida pelo RH"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
                />
              </div>
            </div>
            {canEvaluar && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">% Atingido S1</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={0} max={200} step={1}
                      value={coletiva.pct_s1 ?? ''}
                      onChange={e => updateItem(itens.indexOf(coletiva), 'pct_s1', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="0–100+"
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400"
                    />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">% Atingido S2</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={0} max={200} step={1}
                      value={coletiva.pct_s2 ?? ''}
                      onChange={e => updateItem(itens.indexOf(coletiva), 'pct_s2', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="0–100+"
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400"
                    />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Individual goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Metas Individuais</h3>
            <span className="text-xs text-slate-500">({cat.elegIndividual} salário{cat.elegIndividual !== 1 ? 's' : ''} distribuído{individuals.length > 1 ? 's' : ''} entre {individuals.length} meta{individuals.length !== 1 ? 's' : ''})</span>
          </div>
          {canEdit && (
            <button
              onClick={addGoal}
              className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
            >
              <Plus size={13} /> Adicionar Meta
            </button>
          )}
        </div>

        <div className="p-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>Use a metodologia SMART: metas <strong>E</strong>specíficas, <strong>M</strong>ensuráveis, <strong>A</strong>tingíveis, <strong>R</strong>elevantes e com <strong>P</strong>razo definido.</span>
        </div>

        {individuals.map((item, idx) => {
          const globalIdx = itens.indexOf(item)
          const pesoFormatted = (item.peso * 100).toFixed(1)
          return (
            <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-bold">{idx + 1}</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Meta Individual</span>
                <span className="ml-auto text-xs text-slate-400">{item.peso.toFixed(4)} sal. ({pesoFormatted}%)</span>
                {canEdit && individuals.length > 1 && (
                  <button
                    onClick={() => removeGoal(idx)}
                    className="ml-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Descrição da Meta <span className="text-red-400">*</span></label>
                  <textarea
                    rows={2}
                    value={item.descricao || ''}
                    onChange={e => updateItem(globalIdx, 'descricao', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Descreva a meta usando metodologia SMART..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Métrica 1º Semestre</label>
                    <input
                      value={item.metrica_s1 || ''}
                      onChange={e => updateItem(globalIdx, 'metrica_s1', e.target.value)}
                      disabled={!canEdit}
                      placeholder="O que será avaliado até jun/2026"
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Métrica 2º Semestre</label>
                    <input
                      value={item.metrica_s2 || ''}
                      onChange={e => updateItem(globalIdx, 'metrica_s2', e.target.value)}
                      disabled={!canEdit}
                      placeholder="O que será avaliado até dez/2026 (ou N/A)"
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400 disabled:opacity-60"
                    />
                  </div>
                </div>

                {canEvaluar && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">% Atingido S1</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} max={200} step={1}
                          value={item.pct_s1 ?? ''}
                          onChange={e => updateItem(globalIdx, 'pct_s1', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="0–100+"
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400"
                        />
                        <span className="text-sm text-slate-400">%</span>
                      </div>
                      {item.pct_s1 !== null && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          = {calcBonus(item, 1).toFixed(3)} sal.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">% Atingido S2</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} max={200} step={1}
                          value={item.pct_s2 ?? ''}
                          onChange={e => updateItem(globalIdx, 'pct_s2', e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="0–100+"
                          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-400"
                        />
                        <span className="text-sm text-slate-400">%</span>
                      </div>
                      {item.pct_s2 !== null && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          = {calcBonus(item, 2).toFixed(3)} sal.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          Cancelar
        </button>
        <div className="flex-1" />
        {canEdit && (
          <>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Salvando…' : 'Salvar rascunho'}
            </button>
            {initial?.status !== 'aprovado' && (
              <button
                onClick={() => handleSave('enviado')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                {saving ? 'Enviando…' : 'Enviar para aprovação'}
              </button>
            )}
          </>
        )}
        {canApprove && initial?.status === 'enviado' && (
          <button
            onClick={() => handleSave('aprovado')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            {saving ? 'Aprovando…' : 'Aprovar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── MetaCard ────────────────────────────────────────────────────────────────

function MetaCard({ meta, onEdit, onDelete, canApprove, canEvaluar }: {
  meta: Meta
  onEdit: (m: Meta) => void
  onDelete: (id: number) => void
  canApprove: boolean
  canEvaluar: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const cat      = getCatInfo(meta.categoria)
  const status   = STATUS_CONFIG[meta.status] || STATUS_CONFIG.rascunho
  const StatusIcon = status.icon
  const totalS1  = totalBonus(meta.itens, 1)
  const totalS2  = totalBonus(meta.itens, 2)
  const hasEval  = meta.itens.some(it => it.pct_s1 !== null || it.pct_s2 !== null)

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
              {meta.colaborador_nome || 'Sem nome'}
            </h3>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {meta.cargo && <span>{meta.cargo} · </span>}
            {meta.gestor_nome && <span>Gestor: {meta.gestor_nome} · </span>}
            <span>{cat.label} · {meta.ano}</span>
          </p>
          {hasEval && (
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-slate-500">S1: <strong className="text-slate-700 dark:text-slate-300">{totalS1.toFixed(2)} sal.</strong></span>
              <span className="text-slate-500">S2: <strong className="text-slate-700 dark:text-slate-300">{totalS2.toFixed(2)} sal.</strong></span>
              <span className="text-slate-500">Máx: <strong className="text-slate-700 dark:text-slate-300">{cat.elegColetiva + cat.elegIndividual} sal.</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(meta)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {(canApprove || canEvaluar) ? 'Editar / Avaliar' : 'Ver / Editar'}
          </button>
          {canApprove && (
            <button
              onClick={() => onDelete(meta.id)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded goals preview */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {meta.itens.map((item, i) => (
            <div key={i} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${item.tipo === 'coletiva' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  {item.tipo === 'coletiva' ? 'C' : item.ordem}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                    {item.descricao || <span className="text-slate-400 italic">Meta não preenchida</span>}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-slate-500">
                    {item.metrica_s1 && <span>S1: {item.metrica_s1}</span>}
                    {item.pct_s1 !== null && (
                      <span className={`font-semibold ${(item.pct_s1 ?? 0) >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        S1 atingido: {item.pct_s1}%
                      </span>
                    )}
                    {item.pct_s2 !== null && (
                      <span className={`font-semibold ${(item.pct_s2 ?? 0) >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        S2 atingido: {item.pct_s2}%
                      </span>
                    )}
                    <span className="ml-auto">{item.peso.toFixed(3)} sal.</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MetasPage() {
  const { user } = useAuth()
  const userIsAdmin  = isAdmin(user?.role)
  const userIsGestor = isGestor(user?.role)
  const canApprove   = userIsAdmin
  const canEvaluar   = userIsAdmin || userIsGestor

  const [metas, setMetas]       = useState<Meta[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [editing, setEditing]   = useState<Meta | 'new' | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.metas.list()
      setMetas(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved(saved: Meta) {
    setMetas(prev => {
      const idx = prev.findIndex(m => m.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setEditing(null)
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta meta? Esta ação não pode ser desfeita.')) return
    setDeleting(id)
    try {
      await api.metas.delete(id)
      setMetas(prev => prev.filter(m => m.id !== id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const myMeta  = metas.find(m => m.criado_por === (user as any)?.id)
  const hasMeta = Boolean(myMeta)

  if (editing !== null) {
    const initial = editing === 'new' ? null : editing
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing(null)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← Voltar
          </button>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {editing === 'new' ? 'Nova Meta Individual' : `Meta de ${initial?.colaborador_nome || '—'}`}
          </h2>
          {initial && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[initial.status]?.color}`}>
              {STATUS_CONFIG[initial.status]?.label}
            </span>
          )}
        </div>
        <MetaForm
          initial={initial}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
          canApprove={canApprove}
          canEvaluar={canEvaluar}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-500" />
            Metas Individuais
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {userIsAdmin ? 'Gerencie as metas de todos os colaboradores' : 'Preencha e acompanhe suas metas de 2026'}
          </p>
        </div>
        {!hasMeta && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
          >
            <Plus size={15} />
            Nova Meta
          </button>
        )}
        {hasMeta && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus size={15} />
            Nova (outro colaborador)
          </button>
        )}
      </div>

      {/* Policy info card */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs text-blue-700 dark:text-blue-400 space-y-1">
        <p className="font-semibold">Condição para pagamento de bônus — 2026</p>
        <p>O pagamento está vinculado ao atingimento de 110% do EBIT do Grupo Rema Tip Top Brasil. Período de apuração: 01/01/2026 a 31/12/2026.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mr-3" />
          Carregando…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && metas.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma meta cadastrada</p>
          <p className="text-sm mt-1">Clique em "Nova Meta" para começar</p>
        </div>
      )}

      <div className="space-y-4">
        {metas.map(meta => (
          <MetaCard
            key={meta.id}
            meta={meta}
            onEdit={m => setEditing(m)}
            onDelete={handleDelete}
            canApprove={canApprove}
            canEvaluar={canEvaluar}
          />
        ))}
      </div>

      {deleting && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl text-sm text-slate-600">
            Excluindo…
          </div>
        </div>
      )}
    </div>
  )
}
