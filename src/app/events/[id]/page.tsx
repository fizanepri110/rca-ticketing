import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import EventDetailClient from './EventDetailClient'
import type { TicketType } from '@/components/TicketSelector'

// ---------------------------------------------------------------------------
// Server Component — fetch Supabase + rendu SSR
// ---------------------------------------------------------------------------
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Récupération de l'événement avec le nom de l'organisateur
  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from('events')
    .select(`
      id,
      titre,
      description,
      lieu,
      date,
      image_url,
      statut,
      profiles!organisateur_id ( nom )
    `)
    .eq('id', id)
    .eq('statut', 'publie')   // Seuls les événements publiés sont accessibles
    .single()

  if (eventError || !eventRow) {
    notFound()
  }

  // 2. Récupération des types de billets de cet événement
  const { data: ticketRows } = await supabaseAdmin
    .from('ticket_types')
    .select('id, nom, prix, quantite_max, quantite_vendue')
    .eq('event_id', id)
    .order('prix', { ascending: true })

  // 3. Mise en forme des données pour les composants client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organisateurNom = (eventRow.profiles as any)?.nom ?? 'Organisateur inconnu'

  const event = {
    id:          eventRow.id,
    titre:       eventRow.titre,
    description: eventRow.description,
    lieu:        eventRow.lieu,
    date:        eventRow.date,
    image_url:   eventRow.image_url,
    organisateur: organisateurNom,
  }

  const ticketTypes: TicketType[] = (ticketRows ?? []).map((t) => ({
    id:               t.id,
    nom:              t.nom,
    prix:             t.prix,
    quantite_max:     t.quantite_max,
    quantite_vendue:  t.quantite_vendue,
  }))

  return <EventDetailClient event={event} ticketTypes={ticketTypes} />
}
