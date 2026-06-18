import { useEffect } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import './styles/theme.css'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Party from './pages/Party'
import Consensus from './pages/Consensus'
import { useAuthStore } from './store/auth'
import { usePartyStore } from './store/party'
import { connectSocket } from './socket'
import { ErrorBoundary } from './components/ErrorBoundary'

function Protected({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to='/login' replace />
  return <>{children}</>
}

export default function App() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const initialized = useAuthStore((s) => s.initialized)
  const { loadMyGroups, myGroups, currentGroup, selectGroup } = usePartyStore()
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user && initialized) {
      loadMyGroups()
    }
  }, [user, initialized])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token && user) {
      connectSocket(token)
    }
  }, [user])

  const linkBase = 'px-3 py-2 rounded-xl text-sm font-medium transition-colors'
  const isActive = (path: string) =>
    location.pathname === path
      ? 'bg-primary/10 text-primary'
      : 'text-muted hover:text-text hover:bg-background'

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-xl font-semibold animate-pulse text-primary tracking-tight">NOMADIX</div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background text-text'>
      <nav className='flex items-center justify-between px-6 py-4 border-b shadow-sm bg-card border-border sticky top-0 z-50 backdrop-blur-md bg-opacity-80'>
        <div className='flex items-center gap-6'>
          <div className="text-xl font-bold text-primary tracking-tight">NOMADIX</div>
          <div className='flex gap-2 bg-background p-1 rounded-xl border border-border'>
            <Link to='/' className={`${linkBase} ${isActive('/')}`}>📍 Groups</Link>
            {user && (
              <>
                <Link to='/consensus' className={`${linkBase} ${isActive('/consensus')}`}>🗓️ Date Planner</Link>
                <Link to='/party' className={`${linkBase} ${isActive('/party')}`}>🎉 Party Dashboard</Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const isDark = document.documentElement.classList.toggle('dark')
              localStorage.theme = isDark ? 'dark' : 'light'
            }}
            className='p-2 transition border rounded-full border-border text-muted hover:bg-background hover:text-text'
            title="Toggle Theme"
          >
            🌗
          </button>
          {user && (
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-border">
              <span className="text-sm font-medium text-text hidden sm:block">{user.name}</span>
              <button
                onClick={() => logout()}
                className='px-4 py-2 text-sm font-medium text-white transition shadow-md bg-red-500 rounded-xl hover:bg-red-600 active:scale-95'
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Pages */}
      <Routes>
        <Route path='/' element={<Protected><div className="max-w-6xl mx-auto w-full"><Dashboard /></div></Protected>} />
        <Route path='/party' element={<Protected><ErrorBoundary name="Party Route"><Party /></ErrorBoundary></Protected>} />
        <Route path='/consensus' element={<Protected><div className="max-w-6xl mx-auto w-full"><Consensus /></div></Protected>} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
      </Routes>
    </div>
  )
}
