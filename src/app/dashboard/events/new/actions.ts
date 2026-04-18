'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { getServerProfile } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function createEventAction(payload: any) {
  try {
    const profile = await getServerProfile()
    if (!profile || profile.role !== 'organisateur') {
      return { error: 'Accès refusé' }
    }

    const eventId = randomUUID()

    // 1. Insert Event
    const { error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        id: eventId,
        organisateur_id: profile.id,
        titre: payload.titre,
        description: payload.description,
        lieu: payload.lieu,
        date: payload.date,
        image_url: payload.image_url,
        statut: payload.statut,
        capacite_totale: payload.capacite_totale
      })

    if (eventError) {
      console.error('Insert Event Error:', eventError)
      return { error: 'Erreur lors de la création de l\'événement' }
    }

    // 2. Insert Ticket Types
    const ticketsToInsert = payload.ticket_types.map((t: any) => ({
      id: randomUUID(),
      event_id: eventId,
      nom: t.nom,
      prix: t.prix,
      quantite_max: t.quantite_max,
      quantite_vendue: 0
    }))

    const { error: ticketsError } = await supabaseAdmin
      .from('ticket_types')
      .insert(ticketsToInsert)

    if (ticketsError) {
      console.error('Insert Tickets Error:', ticketsError)
      // Rollback could be done here, but simple error is enough for now
      return { error: 'Erreur lors de la création des billets' }
    }

    return { success: true, eventId }
  } catch (err: any) {
    return { error: err.message || 'Erreur interne' }
  }
}
