'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Ticket, Loader2 } from 'lucide-react'
import { supabaseBrowser as supabase } from '@/lib/supabase-browser'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirect') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !authData.user) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Vérifier le rôle de l'utilisateur et rediriger
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    const role = profile?.role ?? 'client'

    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'organisateur') {
      router.push('/dashboard')
    } else if (role === 'controleur') {
      router.push('/scan')
    } else {
      // Client — redirige vers la page demandée ou l'accueil
      router.push(redirectTo)
    }
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-600 text-white rounded-xl p-2">
            <Ticket size={20} />
          </div>
          <span className="font-bold text-lg text-gray-900">RCA Ticketing</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
        <p className="text-sm text-gray-500 mb-6">Accédez à votre compte RCA Ticketing.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              placeholder="vous@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Connexion...</> : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Pas encore de compte ?{' '}
          <a href="/register" className="text-blue-600 font-semibold hover:underline">
            S&apos;inscrire
          </a>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
