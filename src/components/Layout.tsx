import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatBot from './ChatBot'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <ChatBot />
    </div>
  )
}
