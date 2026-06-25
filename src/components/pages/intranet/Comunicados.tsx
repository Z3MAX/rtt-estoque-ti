import { Megaphone, Pin, Clock, ChevronRight } from 'lucide-react'

const COMUNICADOS = [
  { id: 1, titulo: 'Atualização da Política de Benefícios 2026', data: '20/06/2026', categoria: 'RH',       fixado: true,  resumo: 'Informamos que a política de benefícios foi revisada e entrará em vigor em julho de 2026.' },
  { id: 2, titulo: 'Manutenção programada dos sistemas em 25/06', data: '18/06/2026', categoria: 'TI',       fixado: true,  resumo: 'Os sistemas estarão indisponíveis das 22h às 04h para manutenção preventiva.'              },
  { id: 3, titulo: 'Resultado da pesquisa de clima 2026',         data: '15/06/2026', categoria: 'RH',       fixado: false, resumo: 'Confira os resultados da pesquisa de clima organizacional aplicada em maio/2026.'           },
  { id: 4, titulo: 'Novo refeitório — obras concluídas',          data: '10/06/2026', categoria: 'Facilities',fixado: false, resumo: 'As obras de reforma do refeitório foram concluídas. Confira as novas instalações.'          },
  { id: 5, titulo: 'Calendário de férias coletivas 2026',         data: '05/06/2026', categoria: 'RH',       fixado: false, resumo: 'O calendário de férias coletivas do segundo semestre está disponível no portal.'            },
]

const CAT_COLORS: Record<string, string> = {
  RH:        'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
  TI:        'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  Facilities:'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
}

export default function ComunicadosPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Comunicados</h1>
        <p className="text-sm text-slate-400 mt-0.5">Informações e avisos da empresa</p>
      </div>

      <div className="space-y-3">
        {COMUNICADOS.map(c => (
          <div
            key={c.id}
            className={`bg-white dark:bg-slate-800 rounded-2xl border ${c.fixado ? 'border-primary-200 dark:border-primary-800' : 'border-slate-200 dark:border-slate-700'} p-5 flex gap-4 hover:shadow-md transition-all cursor-pointer group`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.fixado ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
              {c.fixado
                ? <Pin size={16} className="text-primary-600 dark:text-primary-400" />
                : <Megaphone size={16} className="text-slate-500 dark:text-slate-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[c.categoria] ?? 'bg-slate-100 text-slate-500'}`}>{c.categoria}</span>
                {c.fixado && <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">📌 Fixado</span>}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{c.titulo}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.resumo}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                <Clock size={11} /> {c.data}
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0 self-center" />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 pt-4 text-slate-400">
        <Megaphone size={24} className="opacity-30" />
        <p className="text-xs italic">Os comunicados reais serão integrados em breve.</p>
      </div>
    </div>
  )
}
