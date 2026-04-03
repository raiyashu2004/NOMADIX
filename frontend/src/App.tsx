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
import { connectSocket } from './socket'

function Protected({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to='/login' replace />
  return <>{children}</>
}

export default function App() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

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

  return (
    <div className='min-h-screen bg-background text-text'>
      {/* Navbar */}
      <nav className='flex items-center justify-between px-6 py-3 border-b shadow-sm bg-card border-border'>
        <div className='flex gap-2'>
          <Link to='/' className={`${linkBase} ${isActive('/')}`}>Home</Link>
          <Link to='/party' className={`${linkBase} ${isActive('/party')}`}>Party</Link>
          {user && (
            <Link to='/consensus' className={`${linkBase} ${isActive('/consensus')}`}>Consensus</Link>
          )}
          <button
            onClick={() => document.documentElement.classList.toggle('dark')}
            className='px-3 py-2 text-sm transition border rounded-xl border-border text-muted hover:bg-background'
          >
            Toggle Theme
          </button>
        </div>
        {user && (
          <button
            onClick={() => logout()}
            className='px-4 py-2 text-sm font-medium text-white transition shadow-sm bg-accent rounded-xl hover:opacity-90'
          >
            Logout
          </button>
        )}
      </nav>

      {/* Pages */}
      <div className='max-w-6xl mx-auto'>
        <Routes>
          <Route path='/' element={<Protected><Dashboard /></Protected>} />
          <Route path='/party' element={<Protected><Party /></Protected>} />
          <Route path='/consensus' element={<Protected><Consensus /></Protected>} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
        </Routes>
      </div>
    </div>
  )
}
