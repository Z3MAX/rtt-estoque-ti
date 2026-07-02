export type NivelCargo =
  | 'trainee' | 'junior' | 'pleno' | 'senior'
  | 'assistente' | 'tecnico' | 'vendedor'
  | 'supervisor' | 'especialista' | 'consultor' | 'engenheiro'
  | 'coordenador' | 'gerente' | 'gerente_executivo' | 'diretor'

export const NIVEL_LABELS: Record<NivelCargo, string> = {
  trainee:          'Trainee',
  junior:           'Analista Júnior',
  pleno:            'Analista Pleno',
  senior:           'Analista Sênior',
  assistente:       'Assistente',
  tecnico:          'Técnico',
  vendedor:         'Vendedor',
  supervisor:       'Supervisor',
  especialista:     'Especialista',
  consultor:        'Consultor',
  engenheiro:       'Engenheiro',
  coordenador:      'Coordenador',
  gerente:          'Gerente',
  gerente_executivo:'Gerente Executivo',
  diretor:          'Diretor Regional',
}

export interface Colaborador {
  id: number
  nome: string
  cargo?: string
  nivel?: NivelCargo
  area?: string
  email?: string
  gestor_nome?: string
  data_nascimento?: string
  data_admissao?: string
  photo_url?: string
  bio?: string
  ativo: boolean
  created_at: string
  updated_at: string
  total_avaliacoes?: number
  ultimo_quadrante?: string
  ultima_avaliacao?: string
}

export type TipoAvaliacao = 'autoavaliacao' | 'lideranca'
export type StatusAvaliacao = 'rascunho' | 'pendente' | 'concluido'

export interface RespostaCompetencia {
  nota: number
  observacao?: string
}

export interface CicloAvaliacao {
  id: number
  colaborador_id: number
  colaborador_nome?: string
  avaliador_id?: number
  avaliador_nome?: string
  tipo: TipoAvaliacao
  periodo_inicial: string
  periodo_final: string
  nivel_cargo?: string
  score_desempenho?: number
  score_potencial?: number
  nivel_desempenho?: string
  nivel_potencial?: string
  quadrante?: string
  respostas?: Record<string, RespostaCompetencia>
  status: StatusAvaliacao
  created_at: string
  updated_at: string
}

export interface DashboardAvaliacoes {
  total_colaboradores: number
  total_avaliacoes: number
  avaliacoes_concluidas: number
  colaboradores_avaliados: number
  colaboradores_avaliados_gestor?: number
  pendente_calibracao?: number
  distribuicao_quadrantes: Array<{ quadrante: string; count: number; label: string }>
  avaliacoes_recentes: CicloAvaliacao[]
  avaliacoes_por_periodo: Array<{ periodo: string; count: number }>
}

export interface SystemUser {
  id: number
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

export interface AuditChange {
  field: string
  label: string
  old_value: string | null
  new_value: string | null
}

export interface AuditEntry {
  id: number
  entity_type: string
  entity_id: number
  entity_name: string | null
  action: 'created' | 'updated' | 'deleted' | 'deactivated' | 'activated' | string
  changes: AuditChange[] | null
  user_id: number | null
  user_name: string | null
  created_at: string
}
