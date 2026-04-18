import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { initCinetPayTransaction } from '@/lib/cinetpay'
import { getServerProfile } from '@/lib/auth'
import { randomUUID } from 'crypto'

interface CheckoutBody {
  event_id: string
  ticket_type_id: string
  quantity: number
  phone_number: string
  user_id: string
}

export async function POST(req: NextRequest) {
  try {
    // --- Vérification de l'authentification côté serveur ---
    // On récupère le profil depuis la session (cookie JWT), pas depuis le body.
    const profile = await getServerProfile()
    if (!profile) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour acheter un billet.' },
        { status: 401 }
      )
    }

    const body: CheckoutBody = await req.json()
    const { event_id, ticket_type_id, quantity, phone_number } = body
    // On force l'user_id depuis la session serveur (jamais depuis le body)
    const user_id = profile.id

    // --- Validation des entrées ---
    if (!event_id || !ticket_type_id || !quantity || !phone_number) {
      return NextResponse.json(
        { error: 'Paramètres manquants.' },
        { status: 400 }
      )
    }
    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: 'Quantité invalide (1-10).' },
        { status: 400 }
      )
    }

    // --- Vérification de disponibilité avec verrou transactionnel ---
    // SELECT FOR UPDATE empêche deux achats simultanés de dépasser le stock
    const { data: ticketType, error: ticketError } = await supabaseAdmin.rpc(
      'check_and_reserve_tickets',
      {
        p_ticket_type_id: ticket_type_id,
        p_quantity: quantity,
      }
    )

    // rpc() avec RETURNS TABLE renvoie un tableau — on prend la 1ère ligne
    const ticketRow = Array.isArray(ticketType) ? ticketType[0] : ticketType

    if (ticketError || !ticketRow) {
      return NextResponse.json(
        { error: 'Places insuffisantes ou type de billet introuvable.' },
        { status: 409 }
      )
    }

    const { available, unit_price, event_title, organizer_name } = ticketRow
    if (!available) {
      return NextResponse.json(
        { error: 'Plus de places disponibles pour cette catégorie.' },
        { status: 409 }
      )
    }

    // --- Calcul du montant total ---
    const amount = unit_price * quantity

    // --- Création de la transaction en base (statut PENDING) ---
    const transactionId = randomUUID()
    const { error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        id: transactionId,
        user_id,
        event_id,
        ticket_type_id,
        quantity,
        amount,
        phone_number,
        operator: phone_number.startsWith('+23672') ? 'Orange Money' : 'Moov Money',
        status: 'PENDING',
      })

    if (insertError) {
      console.error('Erreur insertion transaction:', insertError)
      return NextResponse.json(
        { error: 'Erreur interne. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    // --- Initialisation du paiement CinetPay ---
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
    const cinetPayResponse = await initCinetPayTransaction({
      transaction_id: transactionId,
      amount,
      currency: 'XAF',
      description: `${quantity} billet(s) - ${event_title}`,
      notify_url: `${baseUrl}/api/webhook/cinetpay`,
      return_url: `${baseUrl}/payment/success?ref=${transactionId}`,
      customer_phone_number: phone_number,
      customer_name: profile.nom || 'Client',
      customer_surname: profile.nom?.split(' ').slice(1).join(' ') || 'RCA',
      customer_email: profile.email || 'contact@rcaticketing.com',
    })

    if (cinetPayResponse.code !== '201' || !cinetPayResponse.data?.payment_url) {
      // Annuler la transaction en base si CinetPay échoue
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'FAILED' })
        .eq('id', transactionId)

      return NextResponse.json(
        { error: 'Impossible d\'initier le paiement. Réessayez.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      payment_url: cinetPayResponse.data.payment_url,
      transaction_id: transactionId,
    })
  } catch (err) {
    console.error('Erreur checkout:', err)
    return NextResponse.json(
      { error: 'Erreur serveur inattendue.' },
      { status: 500 }
    )
  }
}
