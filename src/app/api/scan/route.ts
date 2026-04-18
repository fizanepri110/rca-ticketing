import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createHmac } from 'crypto'

interface ScanPayload {
  ticket_id: string
  event_id: string
  secret_hash: string
  issued_at: string
}

export async function POST(req: NextRequest) {
  try {
    const body: ScanPayload = await req.json()
    const { ticket_id, event_id, secret_hash, issued_at } = body

    if (!ticket_id || !event_id || !secret_hash || !issued_at) {
      return NextResponse.json(
        { valid: false, reason: 'QR code invalide ou corrompu.' },
        { status: 400 }
      )
    }

    // Validation du format UUID (évite un crash Supabase sur des valeurs invalides)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(ticket_id) || !uuidRegex.test(event_id)) {
      return NextResponse.json(
        { valid: false, reason: 'Identifiants du billet invalides.' },
        { status: 400 }
      )
    }

    // --- 1. Vérification cryptographique de la signature ---
    // Recrée le hash côté serveur et compare avec celui du QR code
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, status, client_id, ticket_type_id, ticket_types(nom, events(titre))')
      .eq('id', ticket_id)
      .single()

    if (fetchError || !ticket) {
      return NextResponse.json(
        { valid: false, reason: 'Billet introuvable dans le système.' },
        { status: 404 }
      )
    }

    // Recrée le HMAC pour vérifier l'authenticité
    const expectedHash = createHmac('sha256', process.env.TICKET_SECRET_KEY!)
      .update(`${ticket_id}${ticket.client_id}${event_id}`)
      .digest('hex')

    if (expectedHash !== secret_hash) {
      return NextResponse.json(
        { valid: false, reason: 'Signature invalide — billet falsifié.' },
        { status: 200 }
      )
    }

    // --- 2. Vérification du statut ---
    if (ticket.status === 'utilise') {
      return NextResponse.json(
        { valid: false, reason: 'Billet déjà utilisé — doublon détecté.' },
        { status: 200 }
      )
    }

    if (ticket.status === 'annule') {
      return NextResponse.json(
        { valid: false, reason: 'Ce billet a été annulé.' },
        { status: 200 }
      )
    }

    if (ticket.status !== 'paye') {
      return NextResponse.json(
        { valid: false, reason: `Statut inattendu : ${ticket.status}` },
        { status: 200 }
      )
    }

    // --- 3. Marquage atomique comme utilisé (évite les doublons en cas de scan simultané) ---
    const { error: updateError, data: updated } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'utilise', scanned_at: new Date().toISOString() })
      .eq('id', ticket_id)
      .eq('status', 'paye') // Condition atomique : n'update que si encore 'paye'
      .select('id')

    if (updateError || !updated || updated.length === 0) {
      // Race condition : un autre scan a validé ce billet entre-temps
      return NextResponse.json(
        { valid: false, reason: 'Billet déjà utilisé — accès refusé.' },
        { status: 200 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ticketType = ticket.ticket_types as any
    return NextResponse.json({
      valid: true,
      ticket_id,
      categorie: ticketType?.nom ?? 'Standard',
      evenement: ticketType?.events?.titre ?? '',
    })
  } catch (err) {
    console.error('Erreur scan:', err)
    return NextResponse.json(
      { valid: false, reason: 'Erreur serveur.' },
      { status: 500 }
    )
  }
}
