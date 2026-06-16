import { useState } from 'react'
import { X, Minimize2, ChevronDown } from 'lucide-react'

const COPILOT_URL =
  'https://copilotstudio.microsoft.com/environments/Default-3ba4e9dd-629e-4004-9c62-708d327b58a5/bots/cr037_agent1/webchat?__version__=2'

const AVATAR = '/avatar-assistente.png'

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)

  return (
    <>
      {/* Floating button — foto do assistente */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false) }}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-xl hover:shadow-2xl transition-all overflow-hidden border-4 border-primary-600 hover:scale-105"
          title="Falar com o Assistente RTT"
        >
          <img src={AVATAR} alt="Assistente RTT" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-200 ${
            minimized ? 'h-[72px] w-80' : 'w-96 h-[600px]'
          }`}
        >
          {/* Header com foto */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-600 text-white shrink-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 shrink-0">
              <img src={AVATAR} alt="Assistente" className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Assistente RTT</p>
              <p className="text-[11px] text-primary-100 leading-tight">Online · Rema Tip Top</p>
            </div>

            {/* Minimize */}
            <button
              onClick={() => setMinimized(v => !v)}
              className="p-1.5 rounded-lg hover:bg-primary-500 transition-colors"
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              {minimized ? <ChevronDown size={15} /> : <Minimize2 size={15} />}
            </button>

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-primary-500 transition-colors"
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
