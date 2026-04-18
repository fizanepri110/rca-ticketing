import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { generateTicketQR, type GeneratedTicket } from '@/lib/qrGenerator'
import type { PaymentDetails } from '@/app/api/webhook/cinetpay/route'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Détails d'une transaction récupérés depuis Supabase.
 * Correspond à la ligne insérée par /api/checkout au moment de l'achat.
 */
interface TransactionRecord {
  id: string
  user_id: string
  event_id: string
  ticket_type_id: string
  quantity: number
  amount: number
  phone_number: string
  status: string
}

/**
 * Résultat de createTicketsForTransaction :
 * liste des billets créés avec leur QR code, prêts à être envoyés par SMS.
 */
export interface CreatedTicketResult {
  ticket_id: string
  qr_base64: string      // Image QR (data:image/png;base64,...)
  qr_raw_string: string  // JSON brut encodé dans le QR
  phone_number: string   // Numéro de l'acheteur pour l'envoi SMS
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Gère toute la logique Supabase après confirmation d'un paiement CinetPay :
 *
 * 1. Récupère la transaction PENDING en base (via transactionId)
 * 2. Vérifie que le montant correspond (protection contre les manipulations)
 * 3. Passe la transaction au statut PAID
 * 4. Génère un QR code signé pour chaque billet (selon la quantité)
 * 5. Insère les billets dans la table `tickets`
 * 6. Incrémente `quantite_vendue` dans la table `ticket_types`
 * 7. Retourne les billets créés (pour l'envoi SMS)
 *
 * @param paymentDetails  Objet structuré extrait du webhook CinetPay
 * @returns               Liste des billets créés avec leurs QR codes
 */
export async function createTicketsForTransaction(
  paymentDetails: PaymentDetails
): Promise<CreatedTicketResult[]> {
  const { transactionId, amount: paidAmount, phoneNumber } = paymentDetails

  // -------------------------------------------------------------------------
  // 1. Récupération de la transaction en base
  // -------------------------------------------------------------------------
  const { data: transaction, error: fetchError } = await supabaseAdmin
    .from('transactions')
    .select('id, user_id, event_id, ticket_type_id, quantity, amount, phone_number, status')
    .eq('id', transactionId)
    .single<TransactionRecord>()

  if (fetchError || !transaction) {
    throw new Error(
      `[supabaseTicketManager] Transaction introuvable : ${transactionId} — ${fetchError?.message}`
    )
  }

  // Empêche le re-traitement d'une transaction déjà traitée (idempotence)
  if (transaction.status === 'SUCCESS') {
    console.warn(`[supabaseTicketManager] Transaction ${transactionId} déjà traitée — skip.`)
    return []
  }

  // -------------------------------------------------------------------------
  // 2. Vérification du montant (protection contre les fraudes)
  // -------------------------------------------------------------------------
  if (Math.round(paidAmount) !== Math.round(transaction.amount)) {
    // On passe la transaction en FAILED et on lève une erreur
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'FAILED' })
      .eq('id', transactionId)

    throw new Error(
      `[supabaseTicketManager] Montant incohérent pour ${transactionId} : ` +
      `attendu ${transaction.amount} FCFA, reçu ${paidAmount} FCFA.`
    )
  }

  // -------------------------------------------------------------------------
  // 3. Passage de la transaction en SUCCESS (atomique)
  // -------------------------------------------------------------------------
  const { error: updateTxError } = await supabaseAdmin
    .from('transactions')
    .update({ status: 'SUCCESS', paid_at: new Date().toISOString() })
    .eq('id', transactionId)
    .eq('status', 'PENDING') // Condition atomique — ne met à jour que si encore PENDING

  if (updateTxError) {
    throw new Error(
      `[supabaseTicketManager] Impossible de passer la transaction en SUCCESS : ${updateTxError.message}`
    )
  }

  // -------------------------------------------------------------------------
  // 4. Génération des QR codes (un par billet)
  // -------------------------------------------------------------------------
  const generatedTickets: GeneratedTicket[] = []

  for (let i = 0; i < transaction.quantity; i++) {
    const ticketId = randomUUID()
    const qr = await generateTicketQR(
      ticketId,
      transaction.user_id,
      transaction.event_id
    )
    generatedTickets.push(qr)
  }

  // -------------------------------------------------------------------------
  // 5. Insertion des billets dans la table `tickets`
  // -------------------------------------------------------------------------
  const ticketsToInsert = generatedTickets.map((gt) => ({
    id: gt.ticket_id,
    transaction_id: transactionId,
    client_id: transaction.user_id,
    ticket_type_id: transaction.ticket_type_id,
    secret_hash: gt.payload.secret_hash,
    status: 'paye',
    created_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabaseAdmin
    .from('tickets')
    .insert(ticketsToInsert)

  if (insertError) {
    // En cas d'échec d'insertion, on repasse la transaction en PENDING
    // pour qu'un retry soit possible
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'PENDING' })
      .eq('id', transactionId)

    throw new Error(
      `[supabaseTicketManager] Erreur insertion tickets : ${insertError.message}`
    )
  }

  console.log(
    `[supabaseTicketManager] ${transaction.quantity} billet(s) créé(s) pour transaction ${transactionId}`
  )

  // -------------------------------------------------------------------------
  // 6. Incrémentation de quantite_vendue dans ticket_types
  // -------------------------------------------------------------------------
  const { error: incrementError } = await supabaseAdmin.rpc(
    'increment_tickets_sold',
    {
      p_ticket_type_id: transaction.ticket_type_id,
      p_quantity: transaction.quantity,
    }
  )

  if (incrementError) {
    // Non-bloquant : les billets sont déjà créés, on logue juste l'erreur
    console.error(
      `[supabaseTicketManager] Erreur incrémentation quantite_vendue : ${incrementError.message}`
    )
  }

  // -------------------------------------------------------------------------
  // 7. Retourne les billets créés pour l'envoi SMS
  // -------------------------------------------------------------------------
  return generatedTickets.map((gt) => ({
    ticket_id: gt.ticket_id,
    qr_base64: gt.qr_base64,
    qr_raw_string: gt.qr_raw_string,
    phone_number: phoneNumber || transaction.phone_number,
  }))
}
