import * as XLSX from 'xlsx'
import type { Colaborador, NivelCargo } from './types'
import { NIVEL_LABELS } from './types'

/**
 * Planilha de colaboradores: leitura (importação), modelo para o RH e exportação.
 * Importar, exportar e o modelo usam as mesmas colunas, então o arquivo exportado
 * pode ser corrigido no Excel e importado de volta.
 */

export function normalizeKey(k: string): string {
  return k.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export type CampoPlanilha = keyof Pick<Colaborador,
  'nome' | 'cargo' | 'nivel' | 'area' | 'email' | 'gestor_nome' | 'gestor_email' | 'data_nascimento' | 'data_admissao'>

/** Cabeçalhos do modelo/exportação, na ordem das colunas. */
export const COLUNAS: Array<{ campo: CampoPlanilha; titulo: string }> = [
  { campo: 'nome',            titulo: 'Nome' },
  { campo: 'cargo',           titulo: 'Cargo' },
  { campo: 'nivel',           titulo: 'Nível' },
  { campo: 'area',            titulo: 'Área' },
  { campo: 'email',           titulo: 'E-mail' },
  { campo: 'gestor_nome',     titulo: 'Gestor Imediato' },
  { campo: 'gestor_email',    titulo: 'E-mail do Gestor' },
  { campo: 'data_nascimento', titulo: 'Data de Nascimento' },
  { campo: 'data_admissao',   titulo: 'Data de Admissão' },
]

/** Nomes de coluna aceitos (já normalizados) → campo do colaborador. */
export const COLUMN_MAP: Record<string, CampoPlanilha> = {
  // Nome
  nome: 'nome', name: 'nome',
  // Cargo / Função — inclui padrão "Desc_ Função" do RH
  cargo: 'cargo', funcao: 'cargo', position: 'cargo',
  descfuncao: 'cargo', descricaofuncao: 'cargo', descricaodafuncao: 'cargo',
  // Nível
  nivel: 'nivel', level: 'nivel',
  // Área / Departamento — inclui padrão "Desc_ Centro de Custo" do RH
  area: 'area', departamento: 'area', department: 'area',
  desccentrodecusto: 'area', descricaocentrodecusto: 'area', centrodecusto: 'area',
  // E-mail
  email: 'email',
  // Gestor — inclui padrão "Gestor Imediato" do RH
  gestor: 'gestor_nome', gestornome: 'gestor_nome', manager: 'gestor_nome', gerente: 'gestor_nome',
  gestorimediato: 'gestor_nome', gestordireto: 'gestor_nome',
  // E-mail do gestor
  gestoremail: 'gestor_email', emailgestor: 'gestor_email', manageremail: 'gestor_email',
  emaildogestor: 'gestor_email', emailgerente: 'gestor_email',
  // Data de nascimento (aniversário)
  datanascimento: 'data_nascimento', datadenascimento: 'data_nascimento', nascimento: 'data_nascimento',
  dtnascimento: 'data_nascimento', datanasc: 'data_nascimento', aniversario: 'data_nascimento',
  dataaniversario: 'data_nascimento', birthdate: 'data_nascimento',
  // Data de admissão
  dataadmissao: 'data_admissao', datadeadmissao: 'data_admissao', admissao: 'data_admissao',
  dtadmissao: 'data_admissao', dataadm: 'data_admissao', hiredate: 'data_admissao',
}

// ─── Datas ────────────────────────────────────────────────────────────────────

function toIso(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null
  if (y < 1900 || y > 2100) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null // ex: 31/02
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Converte a célula de data do Excel para "AAAA-MM-DD".
 * Aceita data do Excel (número serial), "dd/mm/aaaa", "dd-mm-aaaa", "dd.mm.aaaa" e "aaaa-mm-dd".
 * Ano com 2 dígitos é recusado de propósito: seria ambíguo e geraria data errada.
 * Retorna null se vazia ou inválida (use `celulaVazia` para distinguir).
 */
export function parseDateCell(v: unknown): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return toIso(v.getFullYear(), v.getMonth() + 1, v.getDate())
  if (typeof v === 'number') {
    if (v < 1 || v > 73050) return null
    const p = XLSX.SSF.parse_date_code(v)
    return p ? toIso(p.y, p.m, p.d) : null
  }
  const s = String(v).trim()
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) return toIso(Number(m[3]), Number(m[2]), Number(m[1]))
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(s)
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]))
  return null
}

export const celulaVazia = (v: unknown) => v == null || String(v).trim() === ''

/** Nascimento plausível: 14 a 100 anos. Admissão: de 1960 até o próximo ano. */
export function dataPlausivel(campo: 'data_nascimento' | 'data_admissao', iso: string, hoje = new Date()): boolean {
  const ano = Number(iso.slice(0, 4))
  const atual = hoje.getFullYear()
  return campo === 'data_nascimento'
    ? ano >= atual - 100 && ano <= atual - 14
    : ano >= 1960 && ano <= atual + 1
}

// ─── Nível ────────────────────────────────────────────────────────────────────

const NIVEL_LOOKUP: Record<string, NivelCargo> = (() => {
  const map: Record<string, NivelCargo> = {}
  for (const [key, label] of Object.entries(NIVEL_LABELS) as [NivelCargo, string][]) {
    map[normalizeKey(key)] = key
    map[normalizeKey(label)] = key
  }
  return map
})()

/** Aceita a chave ("pleno") ou o rótulo ("Analista Pleno"). Retorna null se não reconhecer. */
export function parseNivel(v: unknown): NivelCargo | null {
  if (celulaVazia(v)) return null
  return NIVEL_LOOKUP[normalizeKey(String(v))] ?? null
}

// ─── Leitura (importação) ─────────────────────────────────────────────────────

export interface ResultadoLeitura {
  colaboradores: Partial<Colaborador>[]
  /** Linhas com data preenchida porém inválida/implausível (a data é ignorada, o colaborador é importado). */
  datasIgnoradas: number
  /** Linhas com nível não reconhecido (o nível é ignorado). */
  niveisIgnorados: number
  /** Nomes de coluna presentes na planilha que o sistema não reconhece. */
  colunasIgnoradas: string[]
}

export function lerPlanilha(data: ArrayBuffer | string, type: 'array' | 'binary' = 'array'): ResultadoLeitura {
  const wb = XLSX.read(data, { type })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  let datasIgnoradas = 0
  let niveisIgnorados = 0
  const colunasIgnoradas = new Set<string>()

  const colaboradores = raw.map(row => {
    const obj: Partial<Colaborador> = {}
    for (const [k, v] of Object.entries(row)) {
      const campo = COLUMN_MAP[normalizeKey(k)]
      if (!campo) { if (k.trim() && !k.startsWith('__EMPTY')) colunasIgnoradas.add(k.trim()); continue }

      if (campo === 'data_nascimento' || campo === 'data_admissao') {
        if (celulaVazia(v)) continue
        const iso = parseDateCell(v)
        if (iso && dataPlausivel(campo, iso)) obj[campo] = iso
        else datasIgnoradas++
        continue
      }
      if (campo === 'nivel') {
        if (celulaVazia(v)) continue
        const nivel = parseNivel(v)
        if (nivel) obj.nivel = nivel
        else niveisIgnorados++
        continue
      }
      // Texto simples (aceita número, ex.: matrícula digitada como número)
      const str = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
      if (str) (obj as Record<string, string>)[campo] = str
    }
    return obj
  }).filter(r => r.nome)

  return { colaboradores, datasIgnoradas, niveisIgnorados, colunasIgnoradas: [...colunasIgnoradas] }
}

// ─── Modelo e exportação ──────────────────────────────────────────────────────

const LARGURAS = [32, 28, 18, 24, 32, 28, 32, 20, 20]

/** "AAAA-MM-DD" (ou ISO completo) → "dd/mm/aaaa". */
export function isoParaBR(v?: string | null): string {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})/.exec(v) : null
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

function montarLivro(linhas: string[][], incluirInstrucoes: boolean): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet([COLUNAS.map(c => c.titulo), ...linhas])
  ws['!cols'] = LARGURAS.map(wch => ({ wch }))
  // Datas como texto dd/mm/aaaa: evita o Excel reinterpretar conforme a configuração regional
  const colNasc = COLUNAS.findIndex(c => c.campo === 'data_nascimento')
  const colAdm  = COLUNAS.findIndex(c => c.campo === 'data_admissao')
  // No modelo em branco, pré-formata 500 linhas; na exportação, só as linhas existentes
  const ultimaLinha = incluirInstrucoes ? 500 : linhas.length
  for (let r = 1; r <= ultimaLinha; r++) {
    for (const c of [colNasc, colAdm]) {
      const ref = XLSX.utils.encode_cell({ r, c })
      ws[ref] = { ...(ws[ref] ?? { v: '' }), t: 's', z: '@' }
    }
  }
  if (ultimaLinha > linhas.length) ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ultimaLinha, c: COLUNAS.length - 1 } })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores')

  if (incluirInstrucoes) {
    const niveis = (Object.entries(NIVEL_LABELS) as [NivelCargo, string][]).map(([, label]) => label).join(', ')
    const instrucoes = XLSX.utils.aoa_to_sheet([
      ['Como preencher'],
      [''],
      ['Preencha a aba "Colaboradores", uma pessoa por linha. Não altere os títulos da primeira linha.'],
      [''],
      ['Nome', 'Obrigatório. Nome completo. O sistema usa o nome para saber se a pessoa já existe: se já existir, os dados são atualizados; se não, é criada.'],
      ['Cargo', 'Opcional. Ex.: Analista Comercial.'],
      ['Nível', `Opcional. Um destes: ${niveis}.`],
      ['Área', 'Opcional. Departamento / centro de custo. Escreva sempre igual (ex.: "Comercial", não "comercial " nem "Com.").'],
      ['E-mail', 'Opcional. E-mail do colaborador.'],
      ['Gestor Imediato', 'Opcional, mas necessário para o gestor enxergar o colaborador. Nome do gestor exatamente como está no cadastro dele.'],
      ['E-mail do Gestor', 'Opcional. E-mail do gestor.'],
      ['Data de Nascimento', 'Opcional. Formato dd/mm/aaaa (ex.: 25/03/1990). Alimenta os avisos de aniversário na página inicial.'],
      ['Data de Admissão', 'Opcional. Formato dd/mm/aaaa (ex.: 02/08/2019). Alimenta os avisos de tempo de empresa na página inicial.'],
      [''],
      ['Observações'],
      ['• Células em branco não apagam o que já está no sistema; só preenchem.'],
      ['• Datas inválidas ou fora do esperado são ignoradas e o sistema avisa antes de importar.'],
      ['• Para corrigir a base atual: use "Exportar Excel", ajuste e importe o mesmo arquivo de volta.'],
    ])
    instrucoes['!cols'] = [{ wch: 22 }, { wch: 110 }]
    XLSX.utils.book_append_sheet(wb, instrucoes, 'Instruções')
  }
  return wb
}

/** Baixa a planilha em branco (com a aba de instruções) para o RH preencher. */
export function baixarModelo() {
  XLSX.writeFile(montarLivro([], true), 'modelo-importacao-colaboradores.xlsx')
}

/** Baixa a base atual no mesmo formato do modelo, para corrigir e reimportar. */
export function exportarColaboradores(lista: Colaborador[]) {
  const linhas = lista.map(c => [
    c.nome ?? '',
    c.cargo ?? '',
    c.nivel ? (NIVEL_LABELS[c.nivel] ?? c.nivel) : '',
    c.area ?? '',
    c.email ?? '',
    c.gestor_nome ?? '',
    c.gestor_email ?? '',
    isoParaBR(c.data_nascimento),
    isoParaBR(c.data_admissao),
  ])
  const hoje = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(montarLivro(linhas, false), `colaboradores-${hoje}.xlsx`)
}
