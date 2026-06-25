import { TrendingUp, CheckCircle2, Clock, AlertTriangle, Plus } from 'lucide-react'

const INICIATIVAS = [
  { id: 1, titulo: 'Concluir curso de Excel Avançado',       prazo: '30/07/2026', status: 'em-andamento', pct: 60 },
  { id: 2, titulo: 'Participar de 3 reuniões de liderança',  prazo: '30/06/2026', status: 'atrasado',     pct: 33 },
  { id: 3, titulo: 'Leitura: "O Gerente Minuto"',            prazo: '15/08/2026', status: 'pendente',     pct: 0  },
  { id: 4, titulo: 'Apresentação de resultados ao board',    prazo: '20/05/2026', status: 'concluido',    pct: 100},
  { id: 5, titulo: 'Mentorar um colaborador júnior',         prazo: '31/08/2026', status: 'em-andamento', pct: 40 },
]

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  'pendente':     { label: 'Pendente',     cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500'                               },
  'em-andamento': { label: 'Em andamento', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'             },
  'atrasado':     { label: 'Atrasado',     cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'                 },
  'concluido':    { label: 'Concluído',    cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
}

export default function PDIPage() {
  const concluidos  = INICIATIVAS.filter(i => i.status === 'concluido').length
  const atrasados   = INICIATIVAS.filter(i => i.status === 'atrasado').length
  const pendentes   = INICIATIVAS.filter(i => i.status !== 'concluido').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Meu PDI</h1>
          <p className="text-sm text-slate-400 mt-0.5">Plano de Desenvolvimento Individual</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
          <Plus size={15} /> Nova iniciativa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendentes',  value: pendentes,  color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20'      },
          { label: 'Atrasadas',  value: atrasados,  color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20'          },
          { label: 'Concluídas', value: concluidos, color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/20'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center`}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {INICIATIVAS.map(item => {
          const st = STATUS_STYLE[item.status]
          return (
            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 hover:shadow-sm transition-all">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                item.status === 'concluido'    ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                item.status === 'atrasado'     ? 'bg-red-100 dark:bg-red-900/30'         :
                item.status === 'em-andamento' ? 'bg-blue-100 dark:bg-blue-900/30'       :
                'bg-slate-100 dark:bg-slate-700'
              }`}>
                {item.status === 'concluido'    ? <CheckCircle2 size={16} className="text-emerald-600" /> :
                 item.status === 'atrasado'     ? <AlertTriangle size={16} className="text-red-500" />   :
                 item.status === 'em-andamento' ? <TrendingUp size={16} className="text-blue-600" />     :
                 <Clock size={16} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.titulo}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <Clock size={11} /> Prazo: {item.prazo}
                </div>
                {item.pct > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.status === 'concluido' ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400">{item.pct}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-400 italic">As iniciativas reais serão integradas em breve.</p>
      </div>
    </div>
  )
}
