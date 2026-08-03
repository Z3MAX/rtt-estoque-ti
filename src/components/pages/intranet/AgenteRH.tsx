import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Bot, User, RefreshCw, AlertCircle, Lightbulb } from 'lucide-react'
import { api } from '../../../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGESTOES = [
  'Quem teve a melhor nota de desempenho no último ciclo?',
  'Quantos colaboradores estão ativos por área?',
  'Quais cursos têm mais alunos com conclusão pendente?',
  'Liste os 5 colaboradores com maior score de potencial',
  'Quantas pesquisas foram respondidas este mês?',
  'Quais treinamentos presenciais foram realizados?',
  'Qual área tem o maior número de avaliações concluídas?',
  'Mostre um ranking das notas médias por área',
]

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm'
      }`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <FormattedResponse text={msg.content} />
        )}
      </div>
    </div>
  )
}

function FormattedResponse({ text }: { text: string }) {
  // Convert markdown-like formatting to JSX
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        // Bold headers (** or ###)
        if (line.startsWith('### ') || line.startsWith('## ')) {
          return <p key={i} className="font-bold text-slate-800 dark:text-slate-100 mt-2">{line.replace(/^#{2,3}\s/, '')}</p>
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.replace(/^[-•]\s/, '')
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-400 mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </div>
          )
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const [num, ...rest] = line.split('. ')
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-500 font-bold shrink-0 w-5 text-right">{num}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(rest.join('. ')) }} />
            </div>
          )
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      })}
    </div>
  )
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs font-mono">$1</code>')
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function AgenteRH() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(question?: string) {
    const text = (question ?? input).trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages: Message[] = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const result = await api.aiRh.ask(newMessages.map(m => ({ role: m.role, content: m.content })))
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }])
    } catch (err: any) {
      setError(err.message || 'Erro ao processar a pergunta')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Assistente RH
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 uppercase tracking-wide">IA</span>
          </h2>
          <p className="text-xs text-slate-400">Faça perguntas sobre os dados da empresa</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">

        {/* Empty state with suggestions */}
        {isEmpty && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
                <Bot size={28} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">Olá! Como posso ajudar?</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Faça qualquer pergunta sobre colaboradores, avaliações, treinamentos ou pesquisas da Rema Tip Top.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={13} className="text-amber-500" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sugestões de perguntas</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGESTOES.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-xs text-slate-600 dark:text-slate-300 transition-all leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
            <AlertCircle size={15} className="shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-xs underline">Fechar</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Faça uma pergunta sobre os dados da empresa..."
              rows={1}
              disabled={loading}
              className="w-full px-4 py-3 pr-12 text-sm border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none disabled:opacity-60 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          As respostas são geradas por IA com base nos dados do sistema. Verifique informações críticas diretamente no banco.
        </p>
      </div>
    </div>
  )
}
