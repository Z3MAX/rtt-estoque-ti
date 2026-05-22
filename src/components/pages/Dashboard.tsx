import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Monitor, TrendingUp, CheckCircle2, Wrench, XCircle,
  Activity, ArrowRight, Clock, Package, DollarSign,
  MapPin, RefreshCw, Tag, FileDown, FileText,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import * as XLSX from 'xlsx'
import { api } from '../../lib/api'
import type { DashboardData } from '../../lib/types'
import { StatusBadge, statusConfig } from '../ui/Badge'
import { useTheme } from '../../lib/theme'

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const iconMap: Record<string, React.ElementType> = {
  Monitor, Laptop: Monitor, Tv: Monitor, Printer: Monitor,
  Wifi: Activity, Mouse: Monitor, Server: Package, Phone: Monitor,
}

const STATUS_COLORS: Record<string, string> = {
  disponivel: '#10b981',
  em_uso:     '#3b82f6',
  manutencao: '#f59e0b',
  inativo:    '#94a3b8',
}
const STATUS_LABELS: Record<string, string> = {
  disponivel: 'Disponível',
  em_uso:     'Em Uso',
  manutencao: 'Manutenção',
  inativo:    'Inativo',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, icon: Icon, colorClass, sub, subColor,
}: {
  label: string; value: string | number; icon: React.ElementType
  colorClass: string; sub?: string; subColor?: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{label}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-slate-400 dark:text-slate-500'}`}>{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Tooltips ─────────────────────────────────────────────────────────────── */
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</p>
      <p className="text-slate-500 dark:text-slate-400">{p.value} equipamentos ({p.payload.pct}%)</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className="text-slate-500 dark:text-slate-400">{payload[0].value} adicionados</p>
    </div>
  )
}

/* ─── Main ──────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const exportRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [error, setError]               = useState('')
  const [settingUp, setSettingUp]       = useState(false)
  const [setupDone, setSetupDone]       = useState(false)
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null)

  useEffect(() => { load() }, [])

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true); else setRefreshing(true)
      setError('')
      const d = await api.dashboard() as DashboardData
      setData(d)
      setLastUpdated(new Date())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('table'))
        setError('setup_needed')
      else setError(msg)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  async function handleSetup() {
    try {
      setSettingUp(true)
      await api.setup()
      setSetupDone(true)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSettingUp(false)
    }
  }

  /* ── Excel export ─────────────────────────────────────────────────────── */
  function exportToExcel() {
    if (!data) return
    setExportingExcel(true)
    try {
      const wb = XLSX.utils.book_new()
      const today = new Date().toLocaleDateString('pt-BR')

      /* Sheet 1 — Resumo */
      const resumo = [
        ['Dashboard — Gestão de Ativos de TI', '', ''],
        [`Gerado em: ${today}`, '', ''],
        ['', '', ''],
        ['INDICADOR', 'VALOR', 'OBSERVAÇÃO'],
        ['Total de ativos', data.total, ''],
        ['Disponíveis', data.disponivel, `${data.total > 0 ? Math.round((data.disponivel / data.total) * 100) : 0}% do total`],
        ['Em uso', data.em_uso, `${data.total > 0 ? Math.round((data.em_uso / data.total) * 100) : 0}% utilização`],
        ['Em manutenção', data.manutencao, ''],
        ['Inativos', data.inativo, ''],
        ['Valor total do patrimônio (R$)', data.totalValue, data.valuedCount > 0 ? `${data.valuedCount} equipamentos com valor cadastrado` : 'Nenhum valor cadastrado'],
      ]
      const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
      wsResumo['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 44 }]
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

      /* Sheet 2 — Por Categoria */
      const catRows = [
        ['Por Categoria', '', ''],
        ['CATEGORIA', 'EQUIPAMENTOS', '% DO TOTAL'],
        ...data.byCategory.map((c) => [
          c.name,
          c.count,
          data.total > 0 ? `${Math.round((c.count / data.total) * 100)}%` : '0%',
        ]),
      ]
      const wsCat = XLSX.utils.aoa_to_sheet(catRows)
      wsCat['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria')

      /* Sheet 3 — Por Local */
      const locRows = [
        ['Por Local', '', ''],
        ['LOCAL', 'EQUIPAMENTOS', '% DO TOTAL'],
        ...data.byLocation.map((l) => [
          l.name,
          l.count,
          data.total > 0 ? `${Math.round((l.count / data.total) * 100)}%` : '0%',
        ]),
      ]
      const wsLoc = XLSX.utils.aoa_to_sheet(locRows)
      wsLoc['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsLoc, 'Por Local')

      /* Sheet 4 — Crescimento Mensal */
      const monthRows = [
        ['Novos Equipamentos por Mês (últimos 6 meses)', ''],
        ['MÊS', 'NOVOS EQUIPAMENTOS'],
        ...data.monthlyGrowth.map((m) => [m.month, m.count]),
      ]
      const wsMonth = XLSX.utils.aoa_to_sheet(monthRows)
      wsMonth['!cols'] = [{ wch: 16 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(wb, wsMonth, 'Crescimento Mensal')

      /* Sheet 5 — Equipamentos Recentes */
      const recentRows = [
        ['Equipamentos Adicionados Recentemente', '', '', '', ''],
        ['NOME', 'MARCA/MODELO', 'CATEGORIA', 'STATUS', 'DATA'],
        ...data.recent.map((eq) => [
          eq.name,
          [eq.brand, eq.model].filter(Boolean).join(' ') || '—',
          eq.category_name || '—',
          statusConfig[eq.status]?.label ?? eq.status,
          new Date(eq.created_at).toLocaleDateString('pt-BR'),
        ]),
      ]
      const wsRecent = XLSX.utils.aoa_to_sheet(recentRows)
      wsRecent['!cols'] = [{ wch: 36 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsRecent, 'Recentes')

      const filename = `dashboard_rtt_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, filename)
    } finally {
      setExportingExcel(false)
    }
  }

  /* ── PDF export ───────────────────────────────────────────────────────── */
  async function exportToPDF() {
    if (!data || !exportRef.current) return
    setExportingPDF(true)

    // Temporarily force light mode for clean PDF capture
    const wasDark = document.documentElement.classList.contains('dark')
    if (wasDark) {
      document.documentElement.classList.remove('dark')
      await new Promise((r) => setTimeout(r, 120))
    }

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const element = exportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        windowWidth: 1280,
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210
      const pageH = 297
      const margin = 10
      const headerH = 18
      const footerH = 10
      const contentW = pageW - margin * 2
      const availH = pageH - headerH - footerH - margin

      // Scale canvas to content width
      const scale = (contentW * 2) / canvas.width  // 2 because scale:2 above...
      // Actually canvas.width is already at 2x scale from html2canvas
      // contentW in mm → need pixels: contentW / 25.4 * 96 (screen dpi)
      // But we work in mm: imgHeight = canvas.height * contentW / canvas.width
      const imgH = (canvas.height * contentW) / canvas.width
      const totalPages = Math.ceil(imgH / availH)
      const pxPerMM = canvas.width / contentW

      const today = formatDate()

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage()

        /* ── Header ── */
        pdf.setFillColor(227, 6, 19)
        pdf.rect(0, 0, pageW, headerH, 'F')

        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('REMA TIP TOP', margin, 7)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text('Gestão de Ativos de TI', margin, 12.5)

        // Right side: date
        pdf.setFontSize(8)
        pdf.text(today, pageW - margin, 7, { align: 'right' })
        pdf.text(`Dashboard  ·  Pág. ${page + 1} de ${totalPages}`, pageW - margin, 12.5, { align: 'right' })

        /* ── Content slice ── */
        const srcY     = page * availH * pxPerMM
        const srcH     = Math.min(availH * pxPerMM, canvas.height - srcY)
        const sliceH   = (srcH / pxPerMM)  // in mm

        // Create a canvas slice for this page
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width  = canvas.width
        sliceCanvas.height = Math.ceil(srcH)
        const ctx = sliceCanvas.getContext('2d')!
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

        pdf.addImage(
          sliceCanvas.toDataURL('image/png', 0.95),
          'PNG',
          margin,
          headerH,
          contentW,
          sliceH,
        )

        /* ── Footer ── */
        pdf.setDrawColor(230, 230, 230)
        pdf.line(margin, pageH - footerH, pageW - margin, pageH - footerH)
        pdf.setFontSize(7)
        pdf.setTextColor(150, 150, 150)
        pdf.text('Documento confidencial — Rema Tip Top · Gerado automaticamente pelo sistema RTT', margin, pageH - footerH + 4)
        pdf.text(new Date().toLocaleString('pt-BR'), pageW - margin, pageH - footerH + 4, { align: 'right' })
      }

      pdf.save(`dashboard_rtt_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      if (wasDark) document.documentElement.classList.add('dark')
      setExportingPDF(false)
    }
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-5">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-56" />
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  /* ── Setup needed ── */
  if (error === 'setup_needed' || (error && error.includes('DATABASE_URL'))) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[80vh]">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Configuração inicial</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            O banco de dados precisa ser configurado. Certifique-se de que a variável
            <code className="mx-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs">DATABASE_URL</code>
            está definida no Netlify, depois clique em configurar.
          </p>
          {setupDone && <p className="text-emerald-600 text-sm mb-4 font-medium">Banco configurado com sucesso!</p>}
          <button className="btn-primary w-full justify-center" onClick={handleSetup} disabled={settingUp}>
            {settingUp ? 'Configurando...' : 'Configurar banco de dados'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Generic error ── */
  if (error) {
    return (
      <div className="p-8">
        <div className="card p-6 border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">Erro: {error}</p>
          <button className="btn-secondary mt-3 text-xs" onClick={() => load()}>Tentar novamente</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const utilizationPct = data.total > 0 ? Math.round((data.em_uso / data.total) * 100) : 0
  const availablePct   = data.total > 0 ? Math.round((data.disponivel / data.total) * 100) : 0

  const pieData = [
    { name: STATUS_LABELS.disponivel, value: data.disponivel, key: 'disponivel' },
    { name: STATUS_LABELS.em_uso,     value: data.em_uso,     key: 'em_uso' },
    { name: STATUS_LABELS.manutencao, value: data.manutencao, key: 'manutencao' },
    { name: STATUS_LABELS.inativo,    value: data.inativo,    key: 'inativo' },
  ]
    .filter((d) => d.value > 0)
    .map((d) => ({ ...d, pct: data.total > 0 ? Math.round((d.value / data.total) * 100) : 0 }))

  const axisColor = isDark ? '#64748b' : '#94a3b8'
  const gridColor = isDark ? '#1e293b' : '#f1f5f9'

  return (
    <div className="p-8 space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Visão geral do inventário de TI
            {lastUpdated && (
              <span className="ml-2 text-slate-400 dark:text-slate-500">
                · Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Atualizar dados"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={exportToExcel}
            disabled={exportingExcel || !data}
            className="btn-secondary"
            title="Exportar para Excel"
          >
            {exportingExcel ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <FileDown size={15} className="text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={exportToPDF}
            disabled={exportingPDF || !data}
            className="btn-secondary"
            title="Exportar para PDF"
          >
            {exportingPDF ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <FileText size={15} className="text-red-500 dark:text-red-400" />
            )}
            <span className="hidden sm:inline">{exportingPDF ? 'Gerando...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* ── Exportable area ── */}
      <div ref={exportRef} className="space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label="Total de Ativos"
            value={data.total.toLocaleString('pt-BR')}
            icon={Monitor}
            colorClass="bg-primary-500"
          />
          <KpiCard
            label="Disponíveis"
            value={data.disponivel}
            icon={CheckCircle2}
            colorClass="bg-emerald-500"
            sub={`${availablePct}% do total`}
            subColor="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Em Uso"
            value={data.em_uso}
            icon={TrendingUp}
            colorClass="bg-blue-500"
            sub={`${utilizationPct}% utilização`}
            subColor="text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            label="Manutenção"
            value={data.manutencao}
            icon={Wrench}
            colorClass="bg-amber-500"
            sub={data.manutencao > 0 ? 'Atenção necessária' : 'Nenhum pendente'}
            subColor={data.manutencao > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}
          />
          <KpiCard
            label="Inativos"
            value={data.inativo}
            icon={XCircle}
            colorClass="bg-slate-400 dark:bg-slate-600"
          />
          <KpiCard
            label="Valor Total"
            value={data.totalValue > 0 ? formatCurrency(data.totalValue) : '—'}
            icon={DollarSign}
            colorClass="bg-violet-500"
            sub={data.valuedCount > 0 ? `${data.valuedCount} com valor` : 'Sem valores cadastrados'}
            subColor="text-violet-600 dark:text-violet-400"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Status donut */}
          <div className="card p-6 lg:col-span-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Distribuição por status</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{data.total} equipamentos no total</p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly bar chart */}
          <div className="card p-6 lg:col-span-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Novos equipamentos por mês</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Últimos 6 meses</p>
            {data.monthlyGrowth.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyGrowth} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: isDark ? '#1e293b' : '#f8fafc', radius: 6 }} />
                  <Bar dataKey="count" fill="#e30613" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category + Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Tag size={15} className="text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Por categoria</h3>
            </div>
            {data.byCategory.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum equipamento cadastrado</p>
            ) : (
              <div className="space-y-3.5">
                {data.byCategory.map((cat) => {
                  const pct = data.total > 0 ? (cat.count / data.total) * 100 : 0
                  const Icon = iconMap[cat.icon] ?? Monitor
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '25' }}>
                          <Icon size={13} style={{ color: cat.color }} />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 font-medium">{cat.name}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cat.count}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full ml-10">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={15} className="text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Por local</h3>
            </div>
            {data.byLocation.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum local com equipamentos</p>
            ) : (
              <div className="space-y-3.5">
                {data.byLocation.map((loc) => {
                  const pct = data.total > 0 ? (loc.count / data.total) * 100 : 0
                  return (
                    <div key={loc.name}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                          <MapPin size={13} className="text-primary-500 dark:text-primary-400" />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 font-medium">{loc.name}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{loc.count}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full ml-10">
                        <div className="h-full rounded-full bg-primary-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Adicionados recentemente</h3>
              <Link to="/equipamentos" className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhum equipamento cadastrado</p>
            ) : (
              <div className="space-y-1">
                {data.recent.map((eq) => (
                  <div key={eq.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (eq.category_color ?? '#6366f1') + '20' }}>
                      <Monitor size={14} style={{ color: eq.category_color ?? '#6366f1' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{eq.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {[eq.brand, eq.model].filter(Boolean).join(' ') || eq.category_name || '—'}
                      </p>
                    </div>
                    <StatusBadge status={eq.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} className="text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Histórico recente</h3>
            </div>
            {data.recentMovements.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Nenhuma movimentação registrada</p>
            ) : (
              <div className="space-y-0">
                {data.recentMovements.map((m, idx) => (
                  <div key={m.id} className={`flex items-start gap-3 py-2.5 ${idx < data.recentMovements.length - 1 ? 'border-b border-slate-50 dark:border-slate-700/50' : ''}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{m.equipment_name}</span>
                        {m.description && (
                          <><span className="text-slate-400 mx-1">&mdash;</span>
                          <span className="text-slate-500 dark:text-slate-400">{m.description}</span></>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {new Date(m.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>{/* /exportRef */}
    </div>
  )
}
