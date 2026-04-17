'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Ticket, Loader2, Phone, User, Mail, Lock } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

function RegisterForm() {
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom]           = useState('')
  const [phone, setPhone]       = useState('+236')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Création du compte Supabase Auth
    const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: nom.trim(),
          telephone: phone,
          role: 'client'
        }
      }
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Erreur lors de la création du compte.')
      setLoading(false)
      return
    }

    // 2. Insertion ou mise à jour du profil (Upsert)
    const { error: profileError } = await supabaseBrowser
      .from('profiles')
      .upsert({
        id:        data.user.id,
        email:     email,
        nom:       nom.trim(),
        telephone: phone,
        role:      'client',
      }, { onConflict: 'id' })

    if (profileError) {
      console.warn('Upsert profile error (ignoring to allow login):', profileError.message)
      // On logue l'erreur mais on ne bloque pas la redirection.
      // Si le trigger a fait le job ou qu'il y a un souci RLS temporaire,
      // l'utilisateur est de toute façon bien enregistré dans auth.users.
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-600 text-white rounded-xl p-2">
            <Ticket size={20} />
          </div>
          <span className="font-bold text-lg text-gray-900">RCA Ticketing</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Créer un compte</h1>
        <p className="text-sm text-gray-500 mb-6">
          Achetez vos billets en quelques secondes.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={13} className="inline mr-1 text-blue-500" />
              Nom complet
            </label>
            <input
              type="text"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Jean Mbaye"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={13} className="inline mr-1 text-blue-500" />
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone size={13} className="inline mr-1 text-blue-500" />
              Numéro Mobile Money
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition">
              <span className="px-3 py-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">+236</span>
              <input
                type="tel"
                inputMode="numeric"
                required
                placeholder="72 00 00 00"
                value={phone.replace('+236', '')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setPhone('+236' + digits)
                }}
                className="flex-1 px-3 py-3 text-sm outline-none bg-white"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Lock size={13} className="inline mr-1 text-blue-500" />
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 6 caractères</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Création...</>
              : "S'inscrire"
            }
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}