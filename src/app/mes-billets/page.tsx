import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import MesBilletsClient from './MesBilletsClient'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TicketWithEvent {
  id: string
  status: string
  qr_code: string
  created_at: string
  ticket_type_nom: string
  event_titre: string
  event_lieu: string
  event_date: string
  event_image_url: string
}

// ---------------------------------------------------------------------------
// Server Component — récupère les billets du client connecté
// ---------------------------------------------------------------------------
async function getClientTickets(userId: string): Promise<TicketWithEvent[]> {
  const { data: tickets, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      id,
      status,
      qr_code,
      created_at,
      ticket_types ( nom, events ( titre, lieu, date, image_url ) )
    `)
    .eq('client_id', userId)
    .order('created_at', { ascending: false })

  if (error || !tickets) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tickets.map((t: any) => {
    const ticketType = t.ticket_types ?? {}
    const event = ticketType.events ?? {}

    return {
      id: t.id,
      status: t.status,
      qr_code: t.qr_code,
      created_at: t.created_at,
      ticket_type_nom: ticketType.nom ?? 'Standard',
      event_titre: event.titre ?? '',
      event_lieu: event.lieu ?? '',
      event_date: event.date ?? '',
      event_image_url: event.image_url ?? '',
    }
  })
}

export default async function MesBilletsPage() {
  const profile = await getServerProfile()

  if (!profile) {
    redirect('/login?redirect=/mes-billets')
  }

  const tickets = await getClientTickets(profile.id)

  return <MesBilletsClient tickets={tickets} userName={profile.nom || profile.email} />
}
