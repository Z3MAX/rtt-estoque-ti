import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight,
  Loader2, Table2, AlertTriangle,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface ImportRow {
  name: string
  brand?: string
  model?: string
  serial_number?: string
  asset_tag?: string
  status: string
  assigned_to?: string
  location_name?: string
  category_name?: string
  purchase_date?: string
  notes?: string
  _rowIndex: number
  _sheet: string
}

interface ImportModalProps {
  onClose: () => void
  onImported: () => void
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const KNOWN_BRANDS = ['Dell', 'HP', 'Lenovo', 'Acer', 'Asus', 'Apple', 'Samsung', 'LG', 'Positivo', 'Intelbras', 'Brother', 'Epson', 'Canon', 'Xerox']

function extractBrand(model: string): string {
  if (!model) return ''
  for (const b of KNOWN_BRANDS) {
    if (model.toLowerCase().includes(b.toLowerCase())) return b
  }
  return ''
}

function excelDateToISO(serial: unknown): string | undefined {
  if (!serial) return undefined
  if (typeof serial === 'string' && serial.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [d, m, y] = serial.split('/')
    return `${y}-${m}-${d}`
  }
  if (typeof serial === 'number' && serial > 1000) {
    const utcDays = Math.floor(serial - 25569)
    const date = new Date(utcDays * 86400000)
    return date.toISOString().split('T')[0]
  }
  return undefined
}

function detectCategory(sheetName: string, model: string): string {
  const s = sheetName.toLowerCase()
  if (s.includes('servidor')) return 'Servidores'
  if (s.includes('impressora')) return 'Impressoras'
  const m = (model || '').toLowerCase()
  if (m.includes('notebook') || m.includes('laptop')) return 'Notebooks'
  if (m.includes('impressora') || m.includes('printer')) return 'Impressoras'
  if (m.includes('servidor') || m.includes('server')) return 'Servidores'
  if (m.includes('monitor') || m.includes('display')) return 'Monitores'
  if (m.includes('switch') || m.includes('roteador') || m.includes('router') || m.includes('access point')) return 'Redes'
  return 'Computadores'
}

function buildNotes(row: Record<string, unknown>, headers: string[]): string {
  const noteParts: string[] = []
  const noteFields: Record<string, string> = {
    'PROCESSADOR': 'CPU',
    'GPU': 'GPU',
    'MEMORIA': 'Memória',
    'ARMAZENAMENTO': 'Armazenamento',
    'SO': 'Sistema Operacional',
    'MAC ADDRESS': 'MAC',
    'ID TEAM VIEWER': 'TeamViewer',
    'NF COMPRA': 'NF',
    'HOSTNAME': 'Hostname',
    'CLIENTE': 'Cliente',
    'DEPARPAMENTO': 'Departamento',
    'EMPRESA DE COMPRA': 'Empresa',
    'TERMO DE USO ASSINADO?': 'Termo assinado',
  }
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toUpperCase().trim()
    const label = noteFields[h]
    if (label && row[i] != null && String(row[i]).trim() !== '' && String(row[i]).trim() !== '-') {
      // Software fields
      noteParts.push(`${label}: ${row[i]}`)
    }
    if (h.startsWith('SOFTWARE') && row[i] != null && String(row[i]).trim() !== '') {
      noteParts.push(`Software: ${row[i]}`)
    }
  }
  return noteParts.join(' | ')
}

function headerIndex(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex((h) => h?.toUpperCase().trim() === name.toUpperCase().trim())
    if (idx !== -1) return idx
  }
  return -1
}

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): ImportRow[] {
  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][]
  if (data.length < 2) return []

  // Find header row (first row with "MODELO" or "HOSTNAME")
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i] as unknown[]
    const rowStr = row.map((c) => String(c || '').toUpperCase())
    if (rowStr.some((c) => ['MODELO', 'HOSTNAME', 'PATRIMÔNIO', 'PATRIMONIO'].includes(c))) {
      headerRowIdx = i
      break
    }
  }

  const headers = (data[headerRowIdx] as unknown[]).map((h) => String(h || '').trim())
  const dataRows = data.slice(headerRowIdx + 1)

  const iModel      = headerIndex(headers, 'MODELO')
  const iTag        = headerIndex(headers, 'TAG')
  const iPatrimonio = headerIndex(headers, 'PATRIMONIO', 'PATRIMÔNIO')
  const iUsuario    = headerIndex(headers, 'USUÁRIO', 'USUARIO')
  const iResponsavel = headerIndex(headers, 'RESPONSÁVEL', 'RESPONSAVEL')
  const iLocal      = headerIndex(headers, 'LOCAL')
  const iDataCompra = headerIndex(headers, 'DATA/COMPRA', 'DATA COMPRA')

  const rows: ImportRow[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[]
    const modelRaw = iModel >= 0 ? String(row[iModel] || '').trim() : ''
    if (!modelRaw) continue // skip empty rows

    const assignedTo = (iUsuario >= 0 && row[iUsuario])
      ? String(row[iUsuario]).trim()
      : (iResponsavel >= 0 && row[iResponsavel] ? String(row[iResponsavel]).trim() : '')

    const assetTag = iPatrimonio >= 0 && row[iPatrimonio] != null
      ? String(row[iPatrimonio]).trim()
      : ''

    const brand = extractBrand(modelRaw)

    rows.push({
      name: modelRaw,
      brand: brand || undefined,
      model: modelRaw,
      serial_number: iTag >= 0 && row[iTag] ? String(row[iTag]).trim() : undefined,
      asset_tag: assetTag || undefined,
      status: 'disponivel',
      assigned_to: assignedTo || undefined,
      location_name: iLocal >= 0 && row[iLocal] ? String(row[iLocal]).trim() : undefined,
      category_name: detectCategory(sheetName, modelRaw),
      purchase_date: iDataCompra >= 0 ? excelDateToISO(row[iDataCompra]) : undefined,
      notes: buildNotes(row as unknown as Record<string, unknown>, headers) || undefined,
      _rowIndex: headerRowIdx + 1 + i + 1,
      _sheet: sheetName,
    })
  }

  return rows
}

/* ─── Step components ───────────────────────────────────────────────────── */
function StepDot({ step, current }: { step: number; current: number }) {
  const done = current > step
  const active = current === step
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      done ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-400'
    }`}>
      {done ? <CheckCircle2 size={14} /> : step}
    </div>
  )
}

/* ─── Main Modal ─────────────────────────────────────────────────────────── */
export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<{ name: string; rows: ImportRow[] }[]>([])
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ created: number; failed: number; errors: { item: string; error: string }[] } | null>(null)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const allRows = sheets
    .filter((s) => selectedSheets.includes(s.name))
    .flatMap((s) => s.rows)

  /* parse file */
  const handleFile = useCallback((file: File) => {
    setParseError('')
    if (!file.name.match(/\.(xlsx|xls|ods)$/i)) {
      setParseError('Formato inválido. Use arquivos .xlsx ou .xls')
      return
    }
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })

        const parsed = wb.SheetNames.map((name) => ({
          name,
          rows: parseSheet(wb.Sheets[name], name),
        })).filter((s) => s.rows.length > 0)

        if (parsed.length === 0) {
          setParseError('Nenhum dado encontrado no arquivo. Verifique o formato.')
          return
        }

        setSheets(parsed)
        setSelectedSheets(parsed.map((s) => s.name))
        setStep(2)
      } catch (err) {
        setParseError(`Erro ao ler o arquivo: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  /* import */
  async function doImport() {
    setStep(3)
    setProgress(0)

    const BATCH = 10
    let created = 0, failed = 0
    const errors: { item: string; error: string }[] = []

    for (let i = 0; i < allRows.length; i += BATCH) {
      const batch = allRows.slice(i, i + BATCH)
      try {
        const res = await fetch('/.netlify/functions/equipment-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        })
        const data = await res.json()
        created += data.created || 0
        failed += data.failed || 0
        errors.push(...(data.errors || []))
      } catch (err) {
        failed += batch.length
        errors.push(...batch.map((b) => ({ item: b.name, error: 'Erro de rede' })))
      }
      setProgress(Math.round(((i + BATCH) / allRows.length) * 100))
    }

    setResult({ created, failed, errors })
    setStep(4)
  }

  const categoryColors: Record<string, string> = {
    'Notebooks': '#8b5cf6',
    'Computadores': '#6366f1',
    'Servidores': '#f97316',
    'Impressoras': '#f59e0b',
    'Monitores': '#06b6d4',
    'Redes': '#10b981',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Importar Equipamentos</h3>
              <p className="text-xs text-slate-400 mt-0.5">Importe em massa via planilha Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-50 shrink-0">
          {['Upload', 'Prévia', 'Importando', 'Resultado'].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              {idx > 0 && <ChevronRight size={14} className="text-slate-300" />}
              <div className="flex items-center gap-1.5">
                <StepDot step={idx + 1} current={step} />
                <span className={`text-xs font-medium ${step === idx + 1 ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                  dragging ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.ods" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload size={24} className="text-emerald-600" />
                </div>
                <p className="text-slate-700 font-semibold">Arraste o arquivo aqui</p>
                <p className="text-slate-400 text-sm mt-1">ou clique para selecionar</p>
                <p className="text-slate-300 text-xs mt-3">Suporta .xlsx e .xls</p>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 shrink-0" />
                  <p className="text-red-600 text-sm">{parseError}</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500 space-y-1.5">
                <p className="font-semibold text-slate-700 mb-2">Colunas reconhecidas automaticamente:</p>
                {[
                  ['MODELO', 'Nome do equipamento'],
                  ['TAG', 'Número de série'],
                  ['PATRIMONIO', 'Patrimônio'],
                  ['USUÁRIO / RESPONSÁVEL', 'Responsável'],
                  ['LOCAL', 'Localização'],
                  ['DATA/COMPRA', 'Data de compra'],
                  ['PROCESSADOR, MEMÓRIA, SO…', 'Anotações técnicas'],
                ].map(([col, desc]) => (
                  <div key={col} className="flex gap-2">
                    <span className="font-mono text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 shrink-0">{col}</span>
                    <span className="text-xs text-slate-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{fileName}</p>
                  <p className="text-xs text-slate-400">{sheets.reduce((a, s) => a + s.rows.length, 0)} linhas encontradas em {sheets.length} {sheets.length === 1 ? 'aba' : 'abas'}</p>
                </div>
              </div>

              {/* Sheet selector */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Abas para importar</p>
                <div className="flex flex-wrap gap-2">
                  {sheets.map((s) => {
                    const checked = selectedSheets.includes(s.name)
                    return (
                      <button
                        key={s.name}
                        onClick={() => setSelectedSheets((prev) =>
                          checked ? prev.filter((n) => n !== s.name) : [...prev, s.name]
                        )}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                          checked ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <Table2 size={14} />
                        {s.name}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${checked ? 'bg-primary-200 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.rows.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Stats */}
              {allRows.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-3 text-center">
                    <p className="text-xl font-bold text-primary-600">{allRows.length}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Equipamentos</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xl font-bold text-slate-700">
                      {[...new Set(allRows.map((r) => r.category_name).filter(Boolean))].length}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Categorias</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xl font-bold text-slate-700">
                      {[...new Set(allRows.map((r) => r.location_name).filter(Boolean))].length}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Locais</p>
                  </div>
                </div>
              )}

              {/* Preview table */}
              {allRows.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Prévia (primeiros 5)</p>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            {['Modelo', 'Marca', 'Serial', 'Patrimônio', 'Responsável', 'Local', 'Categoria'].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {allRows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-700 max-w-[160px] truncate font-medium">{row.name}</td>
                              <td className="px-3 py-2 text-slate-500">{row.brand || '—'}</td>
                              <td className="px-3 py-2 text-slate-500 font-mono">{row.serial_number || '—'}</td>
                              <td className="px-3 py-2 text-slate-500">{row.asset_tag || '—'}</td>
                              <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{row.assigned_to || '—'}</td>
                              <td className="px-3 py-2 text-slate-500 max-w-[80px] truncate">{row.location_name || '—'}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ background: (categoryColors[row.category_name || ''] || '#6366f1') + '20', color: categoryColors[row.category_name || ''] || '#6366f1' }}>
                                  {row.category_name || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {allRows.length > 5 && (
                      <p className="text-center text-xs text-slate-400 py-2 border-t border-slate-50">
                        + {allRows.length - 5} equipamentos adicionais
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Importing ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Loader2 size={28} className="text-primary-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">Importando equipamentos...</p>
                <p className="text-slate-400 text-sm mt-1">{allRows.length} itens sendo processados</p>
              </div>
              <div className="w-full max-w-sm">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progresso</span>
                  <span>{Math.min(progress, 100)}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Results ── */}
          {step === 4 && result && (
            <div className="space-y-4">
              <div className={`flex flex-col items-center py-6 rounded-2xl ${result.failed === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                {result.failed === 0 ? (
                  <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
                ) : (
                  <AlertTriangle size={40} className="text-amber-500 mb-3" />
                )}
                <p className="text-lg font-bold text-slate-900">
                  {result.failed === 0 ? 'Importação concluída!' : 'Importação com alertas'}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  {result.created} importados com sucesso{result.failed > 0 ? `, ${result.failed} falharam` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Criados com sucesso</p>
                </div>
                <div className="card p-4 text-center">
                  <p className={`text-2xl font-bold ${result.failed > 0 ? 'text-red-500' : 'text-slate-300'}`}>{result.failed}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Falhas</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2.5 border-b border-red-100">
                    <p className="text-sm font-semibold text-red-700">Itens com erro</p>
                  </div>
                  <div className="divide-y divide-red-50 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <div key={i} className="px-4 py-2 flex items-start gap-2">
                        <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-slate-700">{e.item}</p>
                          <p className="text-xs text-red-500">{e.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <span className="text-xs text-slate-400">Selecione um arquivo para continuar</span>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                ← Voltar
              </button>
              <button
                onClick={doImport}
                disabled={allRows.length === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Importar {allRows.length} equipamentos →
              </button>
            </>
          )}
          {step === 3 && (
            <p className="text-xs text-slate-400 mx-auto">Aguarde, não feche esta janela...</p>
          )}
          {step === 4 && (
            <button
              onClick={() => { onImported(); onClose() }}
              className="btn-primary ml-auto"
            >
              Concluir e ver equipamentos
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
