'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  TrendingUp, Ticket, ScanLine, Plus, Trash2,
  Calendar, MapPin, CircleDot, FileEdit, LogOut, User, CheckCircle2
} from 'lucide-react'
import type { UserProfile } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Event {
  id: string
  titre: string
  lieu: string
  date: string
  statut: 'brouillon' | 'en_attente' | 'publie'
}

interface Stats {
  total_ventes: number
  billets_vendus: number
  billets_scannes: number
}

interface Controleur {
  id: string
  telephone: string
  nom: string
  created_at: string
}

interface Props {
  profile: UserProfile
  events: Event[]
  stats: Stats
  controleurs: Controleur[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const STATUS_STYLE: Record<string, string> = {
  brouillon:  'bg-gray-100 text-gray-600',
  en_attente: 'bg-yellow-100 text-yellow-700',
  publie:     'bg-green-100 text-green-700',
}
const STATUS_LABEL: Record<string, string> = {
  brouillon:  'Brouillon',
  en_attente: 'En attente',
  publie:     'Actif',
}

// ---------------------------------------------------------------------------
// Composants
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard principal
// ---------------------------------------------------------------------------
export default function DashboardClient({ profile, events, stats, controleurs }: Props) {
  const searchParams = useSearchParams()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [controleursList, setControleursList] = useState<Controleur[]>(controleurs)
  const [newPhone, setNewPhone] = useState('+236')
  const [newNom, setNewNom] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Affiche le message de succès si on revient d'une création d'événement
  useEffect(() => {
    if (searchParams.get('created')) {
      setSuccessMsg('Événement créé avec succès !')
      const t = setTimeout(() => setSuccessMsg(null), 5000)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  async function handleAddControleur() {
    if (!newPhone || newPhone.length < 10) {
      setAddError('Numéro invalide.')
      return
    }
    if (!newNom.trim()) {
      setAddError('Le nom est obligatoire.')
      return
    }

    setAddLoading(true)
    setAddError(null)

    try {
      const res = await fetch('/api/controleurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: newPhone, nom: newNom.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAddError(data.error ?? 'Erreur lors de l\'ajout.')
        return
      }

      setControleursList((prev) => [data.controleur, ...prev])
      setNewPhone('+236')
      setNewNom('')
    } catch {
      setAddError('Impossible de contacter le serveur.')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleDeleteControleur(id: string) {
    setDeleteId(id)
    try {
      await fetch(`/api/controleurs?id=${id}`, { method: 'DELETE' })
      setControleursList((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeleteId(null)
    }
  }

  const affluencePct = stats.billets_vendus > 0
    ? Math.round((stats.billets_scannes / stats.billets_vendus) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-blue-200 text-xs">Tableau de bord</p>
          <h1 className="font-bold text-lg leading-tight">RCA Ticketing</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-600 rounded-full px-3 py-1.5">
            <User size={14} />
            <span className="text-sm font-medium">{profile.nom || profile.email}</span>
          </div>
          <a
            href="/api/auth/logout"
            className="bg-blue-600 hover:bg-blue-500 rounded-full p-2 transition"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Statistiques */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Vue d&apos;ensemble
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Total Ventes"
              value={formatFCFA(stats.total_ventes)}
              color="bg-blue-600"
            />
            <StatCard
              icon={Ticket}
              label="Billets Vendus"
              value={stats.billets_vendus.toString()}
              color="bg-yellow-500"
            />
            <StatCard
              icon={ScanLine}
              label={`Affluence (${affluencePct}%)`}
              value={stats.billets_scannes.toString()}
              color="bg-green-600"
            />
          </div>
        </section>

        {/* Message de succès création événement */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Liste des événements */}
        <section className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Mes Événements</h2>
            <Link
              href="/dashboard/events/new"
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              Nouvel événement
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <Ticket size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun événement créé pour l&apos;instant.</p>
              <Link
                href="/dashboard/events/new"
                className="inline-flex items-center gap-1.5 mt-4 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                Créer mon premier événement
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {events.map((event) => (
                <div key={event.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[event.statut]}`}>
                        <CircleDot size={10} className="inline mr-1" />
                        {STATUS_LABEL[event.statut]}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{event.titre}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(event.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {event.lieu}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/events/${event.id}/edit`}
                    className="text-gray-400 hover:text-blue-600 transition p-1.5 rounded-lg hover:bg-blue-50"
                    title="Modifier l'événement"
                  >
                    <FileEdit size={17} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gestion des contrôleurs */}
        <section className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Contrôleurs autorisés</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ces personnes peuvent scanner les billets à l&apos;entrée.
            </p>
          </div>

          {/* Formulaire d'ajout */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Nom du contrôleur"
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
              />
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-blue-500 transition">
                <span className="px-3 py-2.5 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">+236</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="72 00 00 00"
                  value={newPhone.replace('+236', '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                    setNewPhone('+236' + digits)
                  }}
                  className="px-3 py-2.5 text-sm outline-none w-32"
                />
              </div>
              <button
                onClick={handleAddControleur}
                disabled={addLoading}
                className="flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Plus size={15} />
                {addLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
            {addError && (
              <p className="text-red-500 text-xs mt-2">{addError}</p>
            )}
          </div>

          {/* Liste des contrôleurs */}
          {controleursList.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">
              <ScanLine size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun contrôleur désigné.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {controleursList.map((c) => (
                <div key={c.id} className="px-6 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{c.nom}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{c.telephone}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteControleur(c.id)}
                    disabled={deleteId === c.id}
                    className="text-gray-300 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40"
                    title="Révoquer l'accès"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
