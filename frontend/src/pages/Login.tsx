import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const { login, loading, error } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch {
      // error is set in store
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-background">
      <div className="w-full max-w-sm p-8 border shadow-md bg-card border-border rounded-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-center text-primary">
          Welcome Back
        </h1>

        {error && (
          <div className="px-4 py-2 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full p-3 transition border border-border rounded-xl bg-background text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 font-medium text-white transition-all shadow-sm rounded-xl bg-accent hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
