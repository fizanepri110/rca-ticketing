'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { validateEventAction } from './actions'

export default function AdminClient({ profile, pendingEvents, allEvents }: { profile: any, pendingEvents: any[], allEvents: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(eventId: string, newStatut: 'publie' | 'brouillon') {
    setLoading(true)
    setError(null)
    const res = await validateEventAction(eventId, newStatut)
    if (res.error) {
      setError(res.error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-700 text-white px-6 py-4 flex items-center gap-4">
        <Link href="/" className="bg-red-600 hover:bg-red-500 rounded-full p-2 transition">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-red-200 text-xs">Espace Admin - {profile.email}</p>
          <h1 className="font-bold text-lg leading-tight">Validation des Événements</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">En Attente de Validation ({pendingEvents.length})</h2>
          {pendingEvents.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-2xl shadow-sm text-center">Aucun événement en attente.</p>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map(ev => (
                <div key={ev.id} className="bg-white p-6 rounded-3xl shadow-sm flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{ev.titre}</h3>
                    <p className="text-sm text-gray-500">Par: {ev.profiles?.nom || ev.profiles?.email}</p>
                    <p className="text-sm text-gray-500">Lieu: {ev.lieu} - Date: {new Date(ev.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(ev.id, 'publie')}
                      disabled={loading}
                      className="bg-green-100 hover:bg-green-200 text-green-700 font-bold px-4 py-2 rounded-xl transition flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Accepter
                    </button>
                    <button
                      onClick={() => handleAction(ev.id, 'brouillon')}
                      disabled={loading}
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 rounded-xl transition flex items-center gap-2"
                    >
                      <XCircle size={16} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Derniers Événements ({allEvents.length})</h2>
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 font-semibold text-gray-700">Titre</th>
                  <th className="p-4 font-semibold text-gray-700">Organisateur</th>
                  <th className="p-4 font-semibold text-gray-700">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allEvents.map(ev => (
                  <tr key={ev.id}>
                    <td className="p-4 font-medium text-gray-900">{ev.titre}</td>
                    <td className="p-4">{ev.profiles?.nom || ev.profiles?.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ev.statut === 'publie' ? 'bg-green-100 text-green-700' : ev.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ev.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
