'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, ArrowLeft, Loader2, Phone, LogIn } from 'lucide-react'
import Link from 'next/link'
import TicketSelector, { type TicketType } from '@/components/TicketSelector'
import { supabaseBrowser } from '@/lib/supabase-browser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Event {
  id: string
  titre: string
  description: string
  lieu: string
  date: string
  image_url: string
  organisateur: string
}

interface Props {
  event: Event
  ticketTypes: TicketType[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Composant principal (client)
// ---------------------------------------------------------------------------
export default function EventDetailClient({ event, ticketTypes }: Props) {
  const router = useRouter()

  const [userId, setUserId]           = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [quantities, setQuantities]   = useState<Record<string, number>>(
    Object.fromEntries(ticketTypes.map((t) => [t.id, 1]))
  )
  const [phoneNumber, setPhoneNumber] = useState('+236')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Récupération de l'utilisateur connecté côté client
  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const selectedTicket = ticketTypes.find((t) => t.id === selectedTicketId)
  const selectedQty    = selectedTicketId ? quantities[selectedTicketId] : 0
  const totalPrice     = selectedTicket ? selectedTicket.prix * selectedQty : 0

  function handleSelect(id: string) {
    setSelectedTicketId((prev) => (prev === id ? null : id))
    setError(null)
  }

  function handleQuantityChange(id: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: qty }))
  }

  async function handleCheckout() {
    if (!userId) {
      setError('Vous devez être connecté pour acheter un billet.')
      return
    }
    if (!selectedTicketId) {
      setError('Veuillez sélectionner une catégorie de billet.')
      return
    }
    if (phoneNumber.length < 12) {
      setError('Veuillez saisir un numéro de téléphone valide (8 chiffres).')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id:       event.id,
          ticket_type_id: selectedTicketId,
          quantity:       selectedQty,
          phone_number:   phoneNumber,
          user_id:        userId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue. Veuillez réessayer.')
        return
      }

      // Redirection vers CinetPay
      window.location.href = data.payment_url
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero image */}
      <div className="relative w-full h-56 md:h-80">
        <Image
          src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'}
          alt={event.titre}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white rounded-full p-2 hover:bg-white/40 transition"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 pb-40">

        {/* Bannière connexion si non connecté */}
        {!userId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
            <p className="text-sm text-yellow-800">
              Connectez-vous pour acheter un billet.
            </p>
            <Link
              href={`/login?redirect=/events/${event.id}`}
              className="flex items-center gap-1.5 text-sm font-semibold text-yellow-900 bg-yellow-200 px-3 py-1.5 rounded-xl hover:bg-yellow-300 transition"
            >
              <LogIn size={14} />
              Se connecter
            </Link>
          </div>
        )}

        {/* Carte principale */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">
            {event.titre}
          </h1>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Calendar size={16} className="text-blue-600 flex-shrink-0" />
              <span className="capitalize">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <MapPin size={16} className="text-blue-600 flex-shrink-0" />
              <span>{event.lieu}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Users size={16} className="text-blue-600 flex-shrink-0" />
              <span>Organisé par <strong>{event.organisateur}</strong></span>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
        </div>

        {/* Sélection des billets */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Choisissez votre billet</h2>
          {ticketTypes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune catégorie de billet disponible pour cet événement.
            </p>
          ) : (
            <div className="space-y-3">
              {ticketTypes.map((ticket) => (
                <TicketSelector
                  key={ticket.id}
                  ticket={ticket}
                  quantity={quantities[ticket.id]}
                  selected={selectedTicketId === ticket.id}
                  onSelect={handleSelect}
                  onQuantityChange={handleQuantityChange}
                />
              ))}
            </div>
          )}
        </div>

        {/* Numéro Mobile Money */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Numéro Mobile Money</h2>
          <p className="text-xs text-gray-500 mb-3">Orange Money ou Moov Money RCA</p>
          <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition">
            <div className="flex items-center gap-2 px-3 py-3 bg-gray-50 border-r border-gray-200">
              <Phone size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">+236</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="72 00 00 00"
              value={phoneNumber.replace('+236', '')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                setPhoneNumber('+236' + digits)
              }}
              className="flex-1 px-3 py-3 text-sm outline-none bg-white"
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Barre de paiement fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {selectedTicket && (
            <div className="flex justify-between text-sm text-gray-600 mb-3">
              <span>
                {selectedQty} × {selectedTicket.nom} ({selectedTicket.prix.toLocaleString('fr-FR')} FCFA)
              </span>
              <span className="font-bold text-gray-900">
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}
          <button
            onClick={handleCheckout}
            disabled={loading || !selectedTicketId || !userId}
            className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Préparation du paiement…
              </>
            ) : (
              <>
                Acheter mon billet
                {selectedTicket && (
                  <span className="ml-1 opacity-80">
                    — {totalPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
