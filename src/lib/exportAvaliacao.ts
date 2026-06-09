import jsPDF from 'jspdf'
import JSZip from 'jszip'
import type { CicloAvaliacao } from './types'

// ─── competency map ───────────────────────────────────────────────────────────

const COMPETENCIAS: Record<string, { nome: string; categoria: 'Desempenho' | 'Potencial' | 'Liderança' }> = {
  'qualidade-entregas':    { nome: 'Qualidade das entregas',         categoria: 'Desempenho' },
  'cumprimento-prazos':    { nome: 'Cumprimento de prazos',          categoria: 'Desempenho' },
  'autonomia-proatividade':{ nome: 'Autonomia e proatividade',       categoria: 'Desempenho' },
  'impacto-time':          { nome: 'Impacto no time / area',         categoria: 'Desempenho' },
  'evolucao-periodo':      { nome: 'Evolucao no periodo',            categoria: 'Desempenho' },
  'foco-cliente':          { nome: 'Foco no Cliente',                categoria: 'Potencial'  },
  'foco-resultado':        { nome: 'Foco no Resultado',              categoria: 'Potencial'  },
  'empreendedorismo':      { nome: 'Empreendedorismo Interno',       categoria: 'Potencial'  },
  'resiliencia':           { nome: 'Resiliencia',                    categoria: 'Potencial'  },
  'alta-performance':      { nome: 'Alta e Consistente Performance', categoria: 'Potencial'  },
  'liderando-negocio':     { nome: 'Liderando o Negocio',            categoria: 'Liderança'  },
  'liderando-pessoas':     { nome: 'Liderando Pessoas',              categoria: 'Liderança'  },
  'liderando-si':          { nome: 'Liderando a Si Mesmo',           categoria: 'Liderança'  },
}

const CATEGORY_ORDER: Array<'Desempenho' | 'Potencial' | 'Liderança'> = ['Desempenho', 'Potencial', 'Liderança']

const LABELS_NOTA = ['Muito baixo', 'Abaixo', 'Adequado', 'Acima', 'Referencia']

// ─── design tokens ────────────────────────────────────────────────────────────

const BRAND:   [number,number,number] = [15, 118, 110]
const GRAY_BG: [number,number,number] = [241, 245, 249]
const GRAY_BD: [number,number,number] = [203, 213, 225]
const TXT_HVY: [number,number,number] = [15,  23,  42 ]
const TXT_MED: [number,number,number] = [51,  65,  85 ]
const TXT_LIT: [number,number,number] = [100,116, 139]
const WHITE:   [number,number,number] = [255,255, 255]

const QUADRANTE_LABELS: Record<string, string> = {
  E3:'Talento Top / Estrela', E2:'Potencial Forte',      E1:'Enigma',
  M3:'Forte Desempenho',      M2:'Mantenedor / Eficaz',  M1:'Questionavel',
  B3:'Dedicado / Especialista',B2:'Bom Profissional',    B1:'Risco / Subpadrao',
}

const TIPO_LABELS: Record<string, string> = {
  lideranca:'Pela lideranca', autoavaliacao:'Autoavaliacao', par:'Por par', rh:'RH',
}

const PERIODOS: Record<string, string> = {
  '1Sem_2024':'1 Sem 2024','2Sem_2024':'2 Sem 2024',
  '1Sem_2025':'1 Sem 2025','2Sem_2025':'2 Sem 2025',
  '1Sem_2026':'1 Sem 2026','2Sem_2026':'2 Sem 2026',
}

const QUADRANTE_COLOR: Record<string, [number,number,number]> = {
  E3:[5,150,105], E2:[22,163,74],  E1:[37,99,235],
  M3:[8,145,178], M2:[100,116,139],M1:[217,119,6],
  B3:[79,70,229], B2:[234,88,12],  B1:[220,38,38],
}

const CAT_COLOR: Record<string,[number,number,number]> = {
  Desempenho: BRAND,
  Potencial:  TXT_MED,
  'Liderança': [101,163,13],
}

// 9-box: rows top=alto potencial, cols left=baixo desempenho
const NINE_BOX: string[][] = [
  ['E1','E2','E3'],
  ['M1','M2','M3'],
  ['B1','B2','B3'],
]
const POT_LABELS = ['Alto','Medio','Baixo']
const DES_LABELS = ['Baixo','Medio','Alto']

// ─── layout helpers ───────────────────────────────────────────────────────────

const PAGE_H   = 297
const PAGE_W   = 210
const MARGIN_L = 14
const MARGIN_R = 14
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R   // 182

function checkPage(doc: jsPDF, y: number, need = 20): number {
  if (y + need > PAGE_H - 20) { doc.addPage(); return 22 }
  return y
}

function hRule(doc: jsPDF, y: number): number {
  doc.setDrawColor(...GRAY_BD)
  doc.setLineWidth(0.2)
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y)
  return y + 4
}

function sectionBand(doc: jsPDF, y: number, title: string, accent: [number,number,number] = TXT_MED): number {
  y = checkPage(doc, y, 16)
  doc.setFillColor(...GRAY_BG)
  doc.rect(MARGIN_L, y, CONTENT_W, 9, 'F')
  // left accent bar
  doc.setFillColor(...accent)
  doc.rect(MARGIN_L, y, 3, 9, 'F')
  doc.setFont('helvetica','bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...TXT_MED)
  doc.text(title.toUpperCase(), MARGIN_L + 6, y + 6)
  return y + 13
}

function scoreBar(doc: jsPDF, x: number, y: number, score: number | null | undefined, w = 30, h = 4) {
  const pct = score != null ? Math.min(Math.max(Number(score) / 5, 0), 1) : 0
  doc.setFillColor(229,231,235)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F')
  if (pct > 0) {
    doc.setFillColor(...BRAND)
    doc.roundedRect(x, y, w * pct, h, 1.5, 1.5, 'F')
  }
}

function fmt(n?: number | null) { return n != null ? Number(n).toFixed(1) : '-' }

function fmtDate(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

export function gerarPDFAvaliacao(av: CicloAvaliacao): jsPDF {
  const doc = new jsPDF({ unit:'mm', format:'a4' })
  let y = 0

  // ── HEADER BAND ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PAGE_W, 28, 'F')

  // Title
  doc.setFont('helvetica','bold')
  doc.setFontSize(15)
  doc.setTextColor(...WHITE)
  doc.text('Gestao de Talentos e Avaliacoes', MARGIN_L, 11)

  doc.setFont('helvetica','normal')
  doc.setFontSize(8)
  doc.setTextColor(180,230,225)
  doc.text('Rema Tip Top  -  Relatorio de Avaliacao', MARGIN_L, 17)
  doc.text('Gerado em ' + fmtDate(new Date().toISOString()), MARGIN_L, 22)

  // Quadrante badge
  if (av.quadrante) {
    const qc = QUADRANTE_COLOR[av.quadrante] ?? TXT_LIT
    doc.setFillColor(...WHITE)
    doc.roundedRect(PAGE_W - 46, 4, 32, 20, 3, 3, 'F')
    doc.setFont('helvetica','bold')
    doc.setFontSize(20)
    doc.setTextColor(...qc)
    doc.text(av.quadrante, PAGE_W - 30, 17, { align:'center' })
  }

  y = 34

  // ── COLABORADOR ───────────────────────────────────────────────────────────────
  y = sectionBand(doc, y, 'Dados do Colaborador')

  // 2-column table
  const rows: [string, string, string, string][] = [
    ['Colaborador:',     av.colaborador_nome ?? '-',                    'Cargo / Nivel:', av.nivel_cargo ?? '-'],
    ['Periodo:',         PERIODOS[av.periodo_inicial] || av.periodo_inicial || '-', 'Tipo:', TIPO_LABELS[av.tipo] || av.tipo || '-'],
    ['Avaliador:',       av.avaliador_nome ?? '-',                      'Data:', fmtDate(av.created_at)],
    ['Quadrante:',       av.quadrante ? av.quadrante + ' - ' + QUADRANTE_LABELS[av.quadrante] : '-', '', ''],
  ]

  const COL1_X = MARGIN_L
  const COL2_X = PAGE_W / 2 + 2
  const LBL_W  = 32
  const ROW_H  = 8

  rows.forEach(([l1, v1, l2, v2], i) => {
    const ry = y + i * ROW_H
    doc.setFont('helvetica','bold')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND)
    doc.text(l1, COL1_X, ry)
    doc.setFont('helvetica','normal')
    doc.setTextColor(...TXT_HVY)
    doc.text(v1, COL1_X + LBL_W, ry)
    if (l2) {
      doc.setFont('helvetica','bold')
      doc.setTextColor(...BRAND)
      doc.text(l2, COL2_X, ry)
      doc.setFont('helvetica','normal')
      doc.setTextColor(...TXT_HVY)
      doc.text(v2, COL2_X + LBL_W, ry)
    }
  })

  y += rows.length * ROW_H + 4
  y = hRule(doc, y)

  // ── PONTUACAO ─────────────────────────────────────────────────────────────────
  y = checkPage(doc, y, 30)
  y = sectionBand(doc, y, 'Pontuacao Geral')

  const scoreRows: [string, number | null | undefined, string | null | undefined][] = [
    ['Desempenho', av.score_desempenho, av.nivel_desempenho],
    ['Potencial',  av.score_potencial,  av.nivel_potencial ],
  ]

  scoreRows.forEach(([label, score, nivel]) => {
    // label
    doc.setFont('helvetica','bold')
    doc.setFontSize(9)
    doc.setTextColor(...TXT_MED)
    doc.text(label, MARGIN_L, y + 1)

    // score value
    doc.setFont('helvetica','bold')
    doc.setFontSize(11)
    doc.setTextColor(...BRAND)
    doc.text(fmt(score), 50, y + 1)

    doc.setFont('helvetica','normal')
    doc.setFontSize(8)
    doc.setTextColor(...TXT_LIT)
    doc.text('/ 5.0', 60, y + 1)

    // nivel pill
    if (nivel) {
      doc.setFillColor(...GRAY_BG)
      doc.roundedRect(78, y - 3.5, 22, 7, 2, 2, 'F')
      doc.setFont('helvetica','bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...TXT_MED)
      doc.text(nivel, 89, y + 0.5, { align:'center' })
    }

    // bar
    scoreBar(doc, 104, y - 3.5, score, 72, 6)
    doc.setFont('helvetica','bold')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND)
    doc.text(fmt(score), PAGE_W - MARGIN_R, y + 1, { align:'right' })

    y += 11
  })

  y += 2
  y = hRule(doc, y)

  // ── 9-BOX ─────────────────────────────────────────────────────────────────────
  y = checkPage(doc, y, 68)
  y = sectionBand(doc, y, 'Posicionamento na Matriz 9-Box')

  const BOX_W = 19
  const BOX_H = 13
  const GRID_X = MARGIN_L + 14   // leave space for Y-axis labels
  const GRID_Y = y

  // Y-axis label (rotated) - Potencial
  doc.setFont('helvetica','bold')
  doc.setFontSize(7)
  doc.setTextColor(...TXT_LIT)
  doc.text('POTENCIAL', MARGIN_L + 1, GRID_Y + (BOX_H * 1.5) + 4, { angle: 90 })

  // Grid
  NINE_BOX.forEach((row, ri) => {
    // row label (Alto/Medio/Baixo)
    doc.setFont('helvetica','normal')
    doc.setFontSize(7)
    doc.setTextColor(...TXT_LIT)
    doc.text(POT_LABELS[ri], GRID_X - 2, GRID_Y + ri * BOX_H + BOX_H / 2 + 1, { align:'right' })

    row.forEach((cell, ci) => {
      const bx = GRID_X + ci * BOX_W
      const by = GRID_Y + ri * BOX_H
      const isActive = cell === av.quadrante
      const cc = QUADRANTE_COLOR[cell] ?? TXT_LIT

      if (isActive) {
        doc.setFillColor(...cc)
        doc.setDrawColor(...cc)
        doc.setLineWidth(0)
      } else {
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(...GRAY_BD)
        doc.setLineWidth(0.3)
      }
      doc.roundedRect(bx + 0.5, by + 0.5, BOX_W - 1, BOX_H - 1, 2, 2, 'FD')

      // cell code
      doc.setFont('helvetica', isActive ? 'bold' : 'normal')
      doc.setFontSize(isActive ? 9 : 7.5)
      doc.setTextColor(isActive ? 255 : 130, isActive ? 255 : 140, isActive ? 255 : 155)
      doc.text(cell, bx + BOX_W / 2, by + BOX_H / 2 + 1, { align:'center' })
    })
  })

  // X-axis col labels (Baixo/Medio/Alto desempenho)
  DES_LABELS.forEach((lbl, ci) => {
    doc.setFont('helvetica','normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...TXT_LIT)
    doc.text(lbl, GRID_X + ci * BOX_W + BOX_W / 2, GRID_Y + NINE_BOX.length * BOX_H + 5, { align:'center' })
  })

  // X-axis title
  doc.setFont('helvetica','bold')
  doc.setFontSize(7)
  doc.setTextColor(...TXT_LIT)
  doc.text('DESEMPENHO', GRID_X + (BOX_W * 3) / 2, GRID_Y + NINE_BOX.length * BOX_H + 10, { align:'center' })

  // Legend on the right of the grid
  const LEG_X = GRID_X + NINE_BOX[0].length * BOX_W + 6
  let legY = GRID_Y + 2

  doc.setFont('helvetica','bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...TXT_MED)
  doc.text('Legenda', LEG_X, legY)
  legY += 5

  const legendItems = Object.entries(QUADRANTE_LABELS)
  legendItems.forEach(([code, label]) => {
    const cc = QUADRANTE_COLOR[code] ?? TXT_LIT
    const isActive = code === av.quadrante
    doc.setFillColor(...cc)
    doc.roundedRect(LEG_X, legY - 3, 8, 5, 1, 1, 'F')
    doc.setFont('helvetica', isActive ? 'bold' : 'normal')
    doc.setFontSize(isActive ? 7 : 6.5)
    doc.setTextColor(...(isActive ? TXT_HVY : TXT_LIT))
    doc.text(code + ' ' + label, LEG_X + 10, legY)
    legY += 5
  })

  y = GRID_Y + NINE_BOX.length * BOX_H + 14
  y = hRule(doc, y)

  // ── COMPETENCIAS ──────────────────────────────────────────────────────────────
  const respostas = av.respostas as unknown as Record<string, { nota?: number; observacao?: string }> | null

  if (respostas && typeof respostas === 'object' && Object.keys(respostas).length > 0) {

    // group by category
    const grouped: Record<string, Array<{ id: string; nome: string; nota?: number; observacao?: string }>> = {
      Desempenho: [], Potencial: [], 'Liderança': [],
    }

    for (const [id, val] of Object.entries(respostas)) {
      const meta = COMPETENCIAS[id]
      const nome = meta?.nome ?? id.replace(/-/g, ' ')
      const cat  = meta?.categoria ?? 'Desempenho'
      grouped[cat].push({ id, nome, nota: val?.nota, observacao: val?.observacao })
    }

    for (const cat of CATEGORY_ORDER) {
      const items = grouped[cat]
      if (!items || items.length === 0) continue

      const accent = CAT_COLOR[cat] ?? BRAND
      y = checkPage(doc, y, 20)
      y = sectionBand(doc, y, 'Competencias - ' + cat, accent)

      for (const item of items) {
        y = checkPage(doc, y, 22)

        const hasObs = !!(item.observacao?.trim())

        // ── competency row ──
        // Name (left, bold, up to 115mm wide)
        doc.setFont('helvetica','bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...TXT_HVY)
        const nameLines = doc.splitTextToSize(item.nome, 115) as string[]
        nameLines.forEach((line: string, li: number) => {
          doc.text(line, MARGIN_L, y + li * 5)
        })
        const nameH = nameLines.length * 5

        // Score area (right-aligned block, x=135)
        if (item.nota != null) {
          const notaLabel = LABELS_NOTA[item.nota - 1] ?? ''
          const scoreX = 135

          // pill bg
          doc.setFillColor(...GRAY_BG)
          doc.roundedRect(scoreX, y - 4, 30, 10, 2, 2, 'F')
          // accent left bar on pill
          doc.setFillColor(...accent)
          doc.roundedRect(scoreX, y - 4, 3, 10, 1, 1, 'F')

          doc.setFont('helvetica','bold')
          doc.setFontSize(8.5)
          doc.setTextColor(...accent)
          doc.text('Nota ' + item.nota, scoreX + 5, y - 0.2)

          doc.setFont('helvetica','normal')
          doc.setFontSize(7)
          doc.setTextColor(...TXT_LIT)
          doc.text(notaLabel, scoreX + 5, y + 3.8)

          // mini bar
          scoreBar(doc, 168, y - 4, item.nota, 24, 10)
        }

        y += Math.max(nameH, 8) + 3

        // ── observation box ──
        if (hasObs) {
          const obsText = item.observacao!.trim()
          const wrappedObs = doc.splitTextToSize(obsText, CONTENT_W - 10) as string[]
          const boxH = wrappedObs.length * 4.8 + 7
          y = checkPage(doc, y, boxH + 4)

          // box bg + border
          doc.setFillColor(250, 252, 255)
          doc.setDrawColor(...GRAY_BD)
          doc.setLineWidth(0.3)
          doc.roundedRect(MARGIN_L, y, CONTENT_W, boxH, 2, 2, 'FD')

          // left accent
          doc.setFillColor(...accent)
          doc.setLineWidth(0)
          doc.roundedRect(MARGIN_L, y, 3, boxH, 1.5, 1.5, 'F')

          // obs label
          doc.setFont('helvetica','bold')
          doc.setFontSize(7)
          doc.setTextColor(...accent)
          doc.text('Justificativa:', MARGIN_L + 6, y + 4.5)

          // obs text
          doc.setFont('helvetica','normal')
          doc.setFontSize(8)
          doc.setTextColor(51, 65, 85)
          let obsY = y + 4.5
          // if label and first line fit on same row:
          doc.text(wrappedObs[0] ?? '', MARGIN_L + 34, obsY)
          if (wrappedObs.length > 1) {
            wrappedObs.slice(1).forEach((line: string) => {
              obsY += 4.8
              doc.text(line, MARGIN_L + 6, obsY)
            })
          }

          y += boxH + 4
        } else {
          y += 2
        }
      }

      y += 2
      y = checkPage(doc, y, 4)
      y = hRule(doc, y)
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const nPages = doc.getNumberOfPages()
  for (let p = 1; p <= nPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...GRAY_BG)
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F')
    doc.setFont('helvetica','normal')
    doc.setFontSize(7)
    doc.setTextColor(...TXT_LIT)
    doc.text('Gestao de Talentos e Avaliacoes  -  Rema Tip Top', MARGIN_L, PAGE_H - 4)
    doc.text('Pagina ' + p + ' de ' + nPages, PAGE_W - MARGIN_R, PAGE_H - 4, { align:'right' })
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

// ─── bulk zip ────────────────────────────────────────────────────────────────

export async function exportarAvaliacoesZip(avaliacoes: CicloAvaliacao[]) {
  const zip = new JSZip()
  const nameCount: Record<string, number> = {}

  for (const av of avaliacoes) {
    const doc = gerarPDFAvaliacao(av)
    const bytes = doc.output('arraybuffer')
    const nome = (av.colaborador_nome ?? 'avaliacao').replace(/\s+/g, '_').toLowerCase()
    const periodo = av.periodo_inicial?.replace(/[^a-zA-Z0-9]/g, '') ?? 'sem_periodo'
    let file = `avaliacao_${nome}_${periodo}.pdf`
    if (nameCount[file] != null) { nameCount[file]++; file = file.replace('.pdf', `_${nameCount[file]}.pdf`) }
    else nameCount[file] = 0
    zip.file(file, bytes)
  }

  const blob = await zip.generateAsync({ type:'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `avaliacoes_${new Date().toISOString().slice(0,10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
