import { useState } from 'react'
import { MessageCircle, X, Minimize2 } from 'lucide-react'

const COPILOT_URL =
  'https://copilotstudio.microsoft.com/environments/Default-3ba4e9dd-629e-4004-9c62-708d327b58a5/bots/cr037_agent1/webchat?__version__=2'

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false) }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          title="Abrir assistente"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all ${
            minimized ? 'h-12 w-72' : 'w-96 h-[580px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-primary-600 text-white shrink-0">
            <MessageCircle size={18} />
            <span className="flex-1 text-sm font-semibold">Assistente RTT</span>
            <button
              onClick={() => setMinimized(v => !v)}
              className="p-1 rounded hover:bg-primary-500 transition-colors"
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              <Minimize2 size={15} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-primary-500 transition-colors"
              title="Fechar"
            >
              <X size={15} />
            </button>
          </div>

          {/* iframe */}
          {!minimized && (
            <iframe
              src={COPILOT_URL}
              title="Assistente RTT Talentos"
              frameBorder="0"
              className="flex-1 w-full"
              allow="microphone"
            />
          )}
        </div>
      )}
    </>
  )
}
