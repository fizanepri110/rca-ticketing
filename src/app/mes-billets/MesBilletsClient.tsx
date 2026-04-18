'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Ticket, ArrowLeft, Calendar, MapPin, QrCode,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react'
import type { TicketWithEvent } from './page'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paye:    { label: 'Valide',   color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  utilise: { label: 'Utilisé',  color: 'bg-gray-100 text-gray-500',   icon: Clock },
  annule:  { label: 'Annulé',   color: 'bg-red-100 text-red-600',     icon: XCircle },
}

// ---------------------------------------------------------------------------
// Composant QR Code inline (depuis le JSON stocké)
// ---------------------------------------------------------------------------
function QRCodeDisplay({ qrJson }: { qrJson: string }) {
  // Le qr_code en base contient le JSON signé.
  // On affiche un placeholder visuel avec les infos clés.
  // L'image QR réelle est générée côté serveur au moment du webhook.
  // Pour l'affichage client, on génère le QR via une lib côté client.
  let ticketId = ''
  try {
    const parsed = JSON.parse(qrJson)
    ticketId = parsed.ticket_id?.slice(0, 8) ?? ''
  } catch {
    // ignore
  }

  return (
    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-3">
      <QrCode size={120} className="text-blue-700" strokeWidth={1} />
      <p className="text-xs text-gray-400 font-mono">
        {ticketId ? `#${ticketId}...` : 'QR Code'}
      </p>
      <p className="text-xs text-gray-500 text-center">
        Présentez ce QR code à l&apos;entrée de l&apos;événement.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Carte d'un billet
// ---------------------------------------------------------------------------
function TicketCard({ ticket }: { ticket: TicketWithEvent }) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.paye
  const StatusIcon = statusInfo.icon
  const isPast = ticket.event_date && new Date(ticket.event_date) < new Date()

  return (
    <div className={`bg-white rounded-3xl shadow-sm overflow-hidden transition-all ${
      ticket.status === 'annule' ? 'opacity-60' : ''
    }`}>
      {/* Image + badge */}
      <div className="relative h-32">
        <Image
          src={ticket.event_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=70'}
          alt={ticket.event_titre}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge statut */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${statusInfo.color}`}>
            <StatusIcon size={12} />
            {statusInfo.label}
          </span>
        </div>

        {/* Badge catégorie */}
        <div className="absolute bottom-3 left-4">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 text-gray-800">
            {ticket.ticket_type_nom}
          </span>
        </div>
      </div>

      {/* Infos */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 leading-snug mb-2">
          {ticket.event_titre}
        </h3>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={12} className="text-blue-500" />
            <span className={isPast ? 'line-through' : ''}>{formatDate(ticket.event_date)}</span>
            {isPast && <span className="text-orange-500 font-medium ml-1">Passé</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} className="text-blue-500" />
            <span>{ticket.event_lieu}</span>
          </div>
        </div>

        {/* Toggle QR */}
        {ticket.status === 'paye' && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-semibold text-sm py-3 rounded-2xl hover:bg-blue-100 transition"
          >
            <QrCode size={16} />
            {expanded ? 'Masquer le QR code' : 'Afficher le QR code'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}

        {expanded && ticket.qr_code && (
          <div className="mt-4">
            <QRCodeDisplay qrJson={ticket.qr_code} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function MesBilletsClient({
  tickets,
  userName,
}: {
  tickets: TicketWithEvent[]
  userName: string
}) {
  const activeTickets = tickets.filter((t) => t.status === 'paye')
  const usedTickets = tickets.filter((t) => t.status === 'utilise')
  const cancelledTickets = tickets.filter((t) => t.status === 'annule')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-500 rounded-full p-2 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-blue-200 text-xs">Bonjour {userName}</p>
          <h1 className="font-bold text-lg leading-tight">Mes Billets</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Compteur */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-2xl px-4 py-2 flex items-center gap-2">
            <Ticket size={16} />
            <span className="text-sm font-semibold">
              {activeTickets.length} billet{activeTickets.length !== 1 ? 's' : ''} actif{activeTickets.length !== 1 ? 's' : ''}
            </span>
          </div>
          {usedTickets.length > 0 && (
            <span className="text-xs text-gray-400">
              {usedTickets.length} utilisé{usedTickets.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Liste vide */}
        {tickets.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
            <Ticket size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm mb-4">
              Vous n&apos;avez pas encore de billets.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition"
            >
              Voir les événements
            </Link>
          </div>
        )}

        {/* Billets actifs */}
        {activeTickets.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Billets valides
            </h2>
            <div className="grid gap-4">
              {activeTickets.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </div>
          </section>
        )}

        {/* Billets utilisés */}
        {usedTickets.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Billets utilisés
            </h2>
            <div className="grid gap-4">
              {usedTickets.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </div>
          </section>
        )}

        {/* Billets annulés */}
        {cancelledTickets.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Billets annulés
            </h2>
            <div className="grid gap-4">
              {cancelledTickets.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
