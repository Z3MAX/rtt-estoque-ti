import jsPDF from 'jspdf'
import JSZip from 'jszip'
import type { CicloAvaliacao } from './types'

// ─── constants ───────────────────────────────────────────────────────────────

const QUADRANTE_LABELS: Record<string, string> = {
  E3: 'Talento Top / Estrela',    E2: 'Potencial Forte',       E1: 'Enigma',
  M3: 'Forte Desempenho',         M2: 'Mantenedor / Eficaz',   M1: 'Questionável',
  B3: 'Dedicado / Especialista',  B2: 'Bom Profissional',      B1: 'Risco / Subpadrão',
}

const TIPO_LABELS: Record<string, string> = {
  lideranca: 'Pela liderança', autoavaliacao: 'Autoavaliação', par: 'Por par', rh: 'RH',
}

const PERIODOS: Record<string, string> = {
  '1Sem_2024': '1º Semestre 2024', '2Sem_2024': '2º Semestre 2024',
  '1Sem_2025': '1º Semestre 2025', '2Sem_2025': '2º Semestre 2025',
  '1Sem_2026': '1º Semestre 2026', '2Sem_2026': '2º Semestre 2026',
}

const QUADRANTE_COLOR: Record<string, [number, number, number]> = {
  E3: [5, 150, 105],  E2: [22, 163, 74],   E1: [37, 99, 235],
  M3: [8, 145, 178],  M2: [100, 116, 139], M1: [217, 119, 6],
  B3: [79, 70, 229],  B2: [234, 88, 12],   B1: [220, 38, 38],
}

const BRAND: [number, number, number] = [15, 118, 110]   // teal-600 approx

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (n == null) return '—'
  return Number(n).toFixed(1)
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function scoreBar(doc: jsPDF, x: number, y: number, score: number | null | undefined, max = 5, w = 80, h = 5) {
  const pct = score != null ? Math.min(Math.max(Number(score) / max, 0), 1) : 0
  // bg
  doc.setFillColor(229, 231, 235)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  // fill
  if (pct > 0) {
    doc.setFillColor(...BRAND)
    doc.roundedRect(x, y, w * pct, h, 2, 2, 'F')
  }
}

function sectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, 182, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text(title.toUpperCase(), 17, y + 5.5)
  return y + 12
}

// ─── main generator ──────────────────────────────────────────────────────────

export function gerarPDFAvaliacao(av: CicloAvaliacao): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  let y = 0

  // ── Header band ──
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 30, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Gestão de Talentos e Avaliações', 14, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(204, 236, 234)
  doc.text('Rema Tip Top  ·  Relatório de Avaliação', 14, 19)
  doc.text(`Gerado em ${fmtDate(new Date().toISOString())}`, 14, 24)

  // quadrante badge in header
  if (av.quadrante) {
    const qColor = QUADRANTE_COLOR[av.quadrante] ?? [100, 116, 139]
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(W - 48, 6, 34, 18, 4, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...qColor)
    doc.text(av.quadrante, W - 31, 18, { align: 'center' })
  }

  y = 38

  // ── Collaborator info ──
  y = sectionTitle(doc, y, 'Dados do Colaborador')

  const fields: [string, string][] = [
    ['Colaborador', av.colaborador_nome ?? '—'],
    ['Cargo / Nível', av.nivel_cargo ?? '—'],
    ['Período',      PERIODOS[av.periodo_inicial] || av.periodo_inicial || '—'],
    ['Tipo de avaliação', TIPO_LABELS[av.tipo] || av.tipo || '—'],
    ['Avaliador',    av.avaliador_nome ?? '—'],
    ['Data',         fmtDate(av.created_at)],
    ['Quadrante',    av.quadrante ? `${av.quadrante} — ${QUADRANTE_LABELS[av.quadrante]}` : '—'],
  ]

  doc.setFontSize(9)
  fields.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const fx = col === 0 ? 14 : 110
    const fy = y + row * 9
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text(label + ':', fx, fy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(value, fx + 38, fy)
  })

  y += Math.ceil(fields.length / 2) * 9 + 6

  // ── Scores ──
  y = sectionTitle(doc, y, 'Pontuação')

  const scores: [string, number | null | undefined, string | null | undefined][] = [
    ['Desempenho', av.score_desempenho, av.nivel_desempenho],
    ['Potencial',  av.score_potencial,  av.nivel_potencial],
  ]

  scores.forEach(([label, score, nivel]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    doc.text(label, 14, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`${fmt(score)} / 5.0`, 50, y)

    if (nivel) {
      doc.setFillColor(229, 231, 235)
      doc.roundedRect(70, y - 4, 26, 6, 2, 2, 'F')
      doc.setFontSize(7.5)
      doc.setTextColor(51, 65, 85)
      doc.text(nivel, 83, y, { align: 'center' })
    }

    scoreBar(doc, 100, y - 4, score, 5, 80, 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(15, 118, 110)
    doc.text(fmt(score), 183, y, { align: 'right' })

    y += 11
  })

  y += 2

  // ── 9-Box visual ──
  if (av.quadrante) {
    y = sectionTitle(doc, y, 'Posicionamento na Matriz 9-Box')

    const boxW = 18
    const boxH = 12
    const startX = 14
    const matrix = [
      ['B3','M3','E3'],
      ['B2','M2','E2'],
      ['B1','M1','E1'],
    ]
    const labels = ['Alto', 'Médio', 'Baixo']

    // axis labels
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text('POTENCIAL', 7, y + (boxH * 1.5), { angle: 90 })
    doc.text('DESEMPENHO →', startX + 10, y + matrix.length * boxH + 5)

    matrix.forEach((row, ri) => {
      // row label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(100, 116, 139)
      doc.text(labels[ri], 10, y + ri * boxH + boxH / 2 + 1, { align: 'right' })

      row.forEach((cell, ci) => {
        const bx = startX + ci * boxW
        const by = y + ri * boxH
        const isActive = cell === av.quadrante
        const color = QUADRANTE_COLOR[cell] ?? [100, 116, 139]

        if (isActive) {
          doc.setFillColor(...color)
          doc.setDrawColor(...color)
        } else {
          doc.setFillColor(248, 250, 252)
          doc.setDrawColor(203, 213, 225)
        }
        doc.roundedRect(bx, by, boxW - 1, boxH - 1, 2, 2, 'FD')

        doc.setFont('helvetica', isActive ? 'bold' : 'normal')
        doc.setFontSize(isActive ? 8 : 7)
        doc.setTextColor(isActive ? 255 : 100, isActive ? 255 : 116, isActive ? 255 : 139)
        doc.text(cell, bx + (boxW - 1) / 2, by + (boxH - 1) / 2 + 1, { align: 'center' })
      })
    })

    y += matrix.length * boxH + 12
  }

  // ── Competências / Respostas ──
  if (av.respostas && typeof av.respostas === 'object') {
    const respostas = av.respostas as Record<string, { score?: number; comment?: string; label?: string }>

    // group by section prefix
    const sections: Record<string, Array<[string, { score?: number; comment?: string; label?: string }]>> = {}
    Object.entries(respostas).forEach(([key, val]) => {
      const parts = key.split('_')
      const section = parts.length > 1 ? parts[0] : 'geral'
      if (!sections[section]) sections[section] = []
      sections[section].push([key, val])
    })

    for (const [section, items] of Object.entries(sections)) {
      // page break check
      if (y > 240) { doc.addPage(); y = 20 }

      const sectionName = section === 'des' ? 'Desempenho'
        : section === 'pot' ? 'Potencial'
        : section === 'lid' ? 'Liderança'
        : section.charAt(0).toUpperCase() + section.slice(1)

      y = sectionTitle(doc, y, `Competências — ${sectionName}`)

      for (const [key, val] of items) {
        if (y > 255) { doc.addPage(); y = 20 }

        const label = val.label || key.replace(/_/g, ' ')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(51, 65, 85)
        doc.text(label, 14, y)

        if (val.score != null) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 116, 139)
          doc.text(`${fmt(val.score)} / 5`, 130, y)
          scoreBar(doc, 140, y - 4, val.score, 5, 50, 4)
        }

        y += 7

        if (val.comment && val.comment.trim()) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(100, 116, 139)
          const lines = doc.splitTextToSize(`"${val.comment.trim()}"`, 176) as string[]
          lines.forEach((line: string) => {
            if (y > 270) { doc.addPage(); y = 20 }
            doc.text(line, 17, y)
            y += 5
          })
          y += 2
        }
      }

      y += 4
    }
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(241, 245, 249)
    doc.rect(0, 285, W, 12, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('Gestão de Talentos e Avaliações  ·  Rema Tip Top', 14, 292)
    doc.text(`Página ${p} de ${pageCount}`, W - 14, 292, { align: 'right' })
  }

  return doc
}

// ─── single export ────────────────────────────────────────────────────────────

export function exportarAvaliacaoUnica(av: CicloAvaliacao) {
  const doc = gerarPDFAvaliacao(av)
  const nome = (av.colaborador_nome ?? 'avaliacao').replace(/\s+/g, '_').toLowerCase()
  const periodo = av.periodo_inicial?.replace(/[^a-zA-Z0-9]/g, '') ?? 'sem_periodo'
  doc.save(`avaliacao_${nome}_${periodo}.pdf`)
}

// ─── bulk export as ZIP ───────────────────────────────────────────────────────

export async function exportarAvaliacoesZip(avaliacoes: CicloAvaliacao[]) {
  const zip = new JSZip()

  const nameCount: Record<string, number> = {}

  for (const av of avaliacoes) {
    const doc = gerarPDFAvaliacao(av)
    const pdfBytes = doc.output('arraybuffer')

    const nome = (av.colaborador_nome ?? 'avaliacao').replace(/\s+/g, '_').toLowerCase()
    const periodo = av.periodo_inicial?.replace(/[^a-zA-Z0-9]/g, '') ?? 'sem_periodo'
    let fileName = `avaliacao_${nome}_${periodo}.pdf`

    // deduplicate filenames
    if (nameCount[fileName] != null) {
      nameCount[fileName]++
      fileName = fileName.replace('.pdf', `_${nameCount[fileName]}.pdf`)
    } else {
      nameCount[fileName] = 0
    }

    zip.file(fileName, pdfBytes)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `avaliacoes_${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
