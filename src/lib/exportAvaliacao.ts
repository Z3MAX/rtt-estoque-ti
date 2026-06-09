import jsPDF from 'jspdf'
import JSZip from 'jszip'
import type { CicloAvaliacao } from './types'

// ─── competency map (mirrors NovaAvaliacao.tsx) ──────────────────────────────

const COMPETENCIAS: Record<string, { nome: string; categoria: 'Desempenho' | 'Potencial' | 'Liderança' }> = {
  'qualidade-entregas':   { nome: 'Qualidade das entregas',              categoria: 'Desempenho' },
  'cumprimento-prazos':   { nome: 'Cumprimento de prazos',               categoria: 'Desempenho' },
  'autonomia-proatividade':{ nome: 'Autonomia e proatividade',           categoria: 'Desempenho' },
  'impacto-time':         { nome: 'Impacto no time / área',              categoria: 'Desempenho' },
  'evolucao-periodo':     { nome: 'Evolução no período',                 categoria: 'Desempenho' },
  'foco-cliente':         { nome: 'Foco no/do Cliente',                  categoria: 'Potencial'  },
  'foco-resultado':       { nome: 'Foco no Resultado',                   categoria: 'Potencial'  },
  'empreendedorismo':     { nome: 'Empreendedorismo Interno',            categoria: 'Potencial'  },
  'resiliencia':          { nome: 'Resiliência',                         categoria: 'Potencial'  },
  'alta-performance':     { nome: 'Alta e Consistente Performance',      categoria: 'Potencial'  },
  'liderando-negocio':    { nome: 'Liderando o Negócio',                 categoria: 'Liderança'  },
  'liderando-pessoas':    { nome: 'Liderando Pessoas',                   categoria: 'Liderança'  },
  'liderando-si':         { nome: 'Liderando a Si Mesmo',                categoria: 'Liderança'  },
}

const CATEGORY_ORDER: Array<'Desempenho' | 'Potencial' | 'Liderança'> = ['Desempenho', 'Potencial', 'Liderança']

const LABELS_NOTA = ['Muito baixo', 'Abaixo', 'Adequado', 'Acima', 'Referência']

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

const BRAND: [number, number, number] = [15, 118, 110]

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  return n != null ? Number(n).toFixed(1) : '—'
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function scoreBar(doc: jsPDF, x: number, y: number, score: number | null | undefined, max = 5, w = 80, h = 5) {
  const pct = score != null ? Math.min(Math.max(Number(score) / max, 0), 1) : 0
  doc.setFillColor(229, 231, 235)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  if (pct > 0) {
    doc.setFillColor(...BRAND)
    doc.roundedRect(x, y, w * pct, h, 2, 2, 'F')
  }
}

function sectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number] = [51, 65, 85]): number {
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, 182, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...color)
  doc.text(title.toUpperCase(), 17, y + 5.5)
  return y + 12
}

function checkPage(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > 275) {
    doc.addPage()
    return 20
  }
  return y
}

// ─── main generator ──────────────────────────────────────────────────────────

export function gerarPDFAvaliacao(av: CicloAvaliacao): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  let y = 0

  // ── Header ──
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

  // ── Dados do colaborador ──
  y = sectionTitle(doc, y, 'Dados do Colaborador')

  const fields: [string, string][] = [
    ['Colaborador',        av.colaborador_nome ?? '—'],
    ['Cargo / Nível',      av.nivel_cargo ?? '—'],
    ['Período',            PERIODOS[av.periodo_inicial] || av.periodo_inicial || '—'],
    ['Tipo de avaliação',  TIPO_LABELS[av.tipo] || av.tipo || '—'],
    ['Avaliador',          av.avaliador_nome ?? '—'],
    ['Data',               fmtDate(av.created_at)],
    ['Quadrante',          av.quadrante ? `${av.quadrante} — ${QUADRANTE_LABELS[av.quadrante]}` : '—'],
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
    doc.text(value, fx + 40, fy)
  })

  y += Math.ceil(fields.length / 2) * 9 + 6

  // ── Pontuação ──
  y = checkPage(doc, y, 30)
  y = sectionTitle(doc, y, 'Pontuação Geral')

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

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(15, 118, 110)
    doc.text(fmt(score), 183, y, { align: 'right' })

    y += 11
  })

  y += 2

  // ── 9-Box ──
  if (av.quadrante) {
    y = checkPage(doc, y, 55)
    y = sectionTitle(doc, y, 'Posicionamento na Matriz 9-Box')

    const boxW = 18
    const boxH = 12
    const startX = 14
    const matrix = [['B3','M3','E3'], ['B2','M2','E2'], ['B1','M1','E1']]
    const potLabels = ['Alto', 'Médio', 'Baixo']

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text('POTENCIAL', 7, y + (boxH * 1.5), { angle: 90 })
    doc.text('DESEMPENHO →', startX + 10, y + matrix.length * boxH + 5)

    matrix.forEach((row, ri) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(100, 116, 139)
      doc.text(potLabels[ri], 10, y + ri * boxH + boxH / 2 + 1, { align: 'right' })

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

  // ── Competências com notas e justificativas ──
  const respostas = av.respostas as unknown as Record<string, { nota?: number; observacao?: string }> | null

  if (respostas && typeof respostas === 'object' && Object.keys(respostas).length > 0) {

    // Group competencies by category, preserving known order
    const grouped: Record<string, Array<{ id: string; nome: string; nota?: number; observacao?: string }>> = {
      Desempenho: [], Potencial: [], Liderança: [],
    }

    for (const [id, val] of Object.entries(respostas)) {
      const meta = COMPETENCIAS[id]
      const nome  = meta?.nome ?? id.replace(/-/g, ' ')
      const cat   = meta?.categoria ?? 'Desempenho'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push({ id, nome, nota: val?.nota, observacao: val?.observacao })
    }

    const catColors: Record<string, [number, number, number]> = {
      Desempenho: [15, 118, 110],
      Potencial:  [51, 65, 85],
      Liderança:  [101, 163, 13],
    }

    for (const cat of CATEGORY_ORDER) {
      const items = grouped[cat]
      if (!items || items.length === 0) continue

      y = checkPage(doc, y, 20)
      y = sectionTitle(doc, y, `Competências — ${cat}`, catColors[cat])

      for (const item of items) {
        y = checkPage(doc, y, 18)

        // competency name + score
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(30, 41, 59)
        doc.text(item.nome, 14, y)

        if (item.nota != null) {
          const notaLabel = LABELS_NOTA[item.nota - 1] ?? ''
          // score pill
          doc.setFillColor(241, 245, 249)
          doc.roundedRect(130, y - 4.5, 38, 7, 2, 2, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(...(catColors[cat]))
          doc.text(`Nota ${item.nota}`, 133, y - 0.5)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(100, 116, 139)
          doc.text(`${notaLabel}`, 133, y + 3.5)

          // mini bar
          scoreBar(doc, 172, y - 4, item.nota, 5, 20, 4)
        }

        y += 7

        // justification / observation
        if (item.observacao && item.observacao.trim()) {
          y = checkPage(doc, y, 14)

          // quote box
          doc.setFillColor(249, 250, 251)
          doc.setDrawColor(203, 213, 225)

          const wrappedLines = doc.splitTextToSize(item.observacao.trim(), 164) as string[]
          const boxH = wrappedLines.length * 4.5 + 6
          doc.roundedRect(17, y - 2, 176, boxH, 2, 2, 'FD')

          // accent left bar
          doc.setFillColor(...catColors[cat])
          doc.rect(17, y - 2, 2.5, boxH, 'F')

          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(71, 85, 105)

          wrappedLines.forEach((line: string) => {
            y = checkPage(doc, y, 6)
            doc.text(line, 22, y + 1.5)
            y += 4.5
          })

          y += 5
        } else {
          y += 2
        }
      }

      y += 3
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
