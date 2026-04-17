'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const params = useSearchParams()
  const ref = params.get('ref')

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
        <p className="text-gray-600 mb-2">
          Votre billet a été généré et envoyé par SMS sur votre téléphone Mobile Money.
        </p>
        {ref && (
          <p className="text-xs text-gray-400 mb-6">
            Référence : <span className="font-mono">{ref}</span>
          </p>
        )}
        <div className="space-y-3">
          <Link
            href="/mes-billets"
            className="block w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl hover:bg-blue-700 transition"
          >
            🎟️ Voir mes billets
          </Link>
          <Link
            href="/"
            className="block w-full border border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
