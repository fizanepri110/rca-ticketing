import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createTicketsForTransaction, type CreatedTicketResult } from '@/lib/supabaseTicketManager'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Tous les champs envoyés par CinetPay dans le body POST du webhook.
 * Référence : https://docs.cinetpay.com/api/1.0-fr/checkout/notification
 */
export interface CinetPayWebhookBody {
  cpm_site_id: string        // Identifiant du site marchand
  cpm_trans_id: string       // ID de la transaction (= notre transaction_id)
  cpm_trans_date: string     // Date/heure de la transaction
  cpm_amount: string         // Montant (en string)
  cpm_currency: string       // Devise (ex: "XAF")
  cpm_result: string         // Résultat : "00" = succès, autre = échec
  signature: string          // Signature interne CinetPay
  payment_method: string     // Méthode (ex: "ORANGE_MONEY", "MOOV_MONEY")
  cel_phone_num: string      // Numéro de téléphone du payeur
  cpm_phone_prefixe: string  // Préfixe téléphonique (ex: "236")
  cpm_language: string       // Langue (ex: "fr")
  cpm_version: string        // Version API CinetPay
  cpm_payment_config: string // Config paiement
  cpm_page_action: string    // Action
  cpm_custom: string         // Données custom passées à l'init (optionnel)
  cpm_designation: string    // Description de la transaction
  cpm_error_message: string  // Message d'erreur si échec
  cpm_payid?: string         // ID de paiement CinetPay (optionnel)
}

/**
 * Détails structurés extraits et validés depuis le body brut.
 * Exporté pour être réutilisé dans supabaseTicketManager.
 */
export interface PaymentDetails {
  transactionId: string
  amount: number
  currency: string
  status: 'SUCCESS' | 'FAILED'
  paymentMethod: string
  phoneNumber: string
  designation: string
  errorMessage: string
  rawBody: CinetPayWebhookBody
}

// ---------------------------------------------------------------------------
// 1. Vérification de la signature HMAC x-token
// ---------------------------------------------------------------------------

/**
 * Vérifie le header `x-token` envoyé par CinetPay.
 *
 * Concaténation des champs (ordre exact CinetPay) :
 *   cpm_site_id + cpm_trans_id + cpm_trans_date + cpm_amount + cpm_currency
 *   + signature + payment_method + cel_phone_num + cpm_phone_prefixe
 *   + cpm_language + cpm_version + cpm_payment_config + cpm_page_action
 *   + cpm_custom + cpm_designation + cpm_error_message
 * → HMAC-SHA256 avec CINETPAY_SECRET_KEY, comparé en timing-safe.
 */
async function verifyCinetPaySignature(
  headers: Record<string, string>,
  body: CinetPayWebhookBody
): Promise<boolean> {
  const secretKey = process.env.CINETPAY_SECRET_KEY
  if (!secretKey) {
    console.warn('[verifyCinetPaySignature] CINETPAY_SECRET_KEY non défini — vérification ignorée.')
    return true
  }

  const receivedToken = headers['x-token']
  if (!receivedToken) {
    console.warn('[verifyCinetPaySignature] Header x-token absent.')
    return false
  }

  const dataToHash = [
    body.cpm_site_id       ?? '',
    body.cpm_trans_id      ?? '',
    body.cpm_trans_date    ?? '',
    body.cpm_amount        ?? '',
    body.cpm_currency      ?? '',
    body.signature         ?? '',
    body.payment_method    ?? '',
    body.cel_phone_num     ?? '',
    body.cpm_phone_prefixe ?? '',
    body.cpm_language      ?? '',
    body.cpm_version       ?? '',
    body.cpm_payment_config?? '',
    body.cpm_page_action   ?? '',
    body.cpm_custom        ?? '',
    body.cpm_designation   ?? '',
    body.cpm_error_message ?? '',
  ].join('')

  const expectedToken = createHmac('sha256', secretKey)
    .update(dataToHash)
    .digest('hex')

  try {
    const receivedBuf = Buffer.from(receivedToken, 'hex')
    const expectedBuf = Buffer.from(expectedToken, 'hex')
    if (receivedBuf.length !== expectedBuf.length) return false
    const isValid = timingSafeEqual(receivedBuf, expectedBuf)
    if (!isValid) console.warn('[verifyCinetPaySignature] Token invalide — requête possiblement falsifiée.')
    return isValid
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// 2. Extraction des détails du paiement
// ---------------------------------------------------------------------------

/**
 * Parse et valide les champs du body CinetPay.
 * cpm_result === "00" → SUCCESS, sinon FAILED.
 */
async function extractPaymentDetails(
  body: CinetPayWebhookBody
): Promise<PaymentDetails> {
  const { cpm_trans_id, cpm_amount, cpm_currency, cpm_result,
          payment_method, cel_phone_num, cpm_phone_prefixe,
          cpm_designation, cpm_error_message } = body

  if (!cpm_trans_id) throw new Error('cpm_trans_id manquant dans le body CinetPay.')
  if (!cpm_amount)   throw new Error('cpm_amount manquant dans le body CinetPay.')

  const phoneNumber = cpm_phone_prefixe && cel_phone_num
    ? `+${cpm_phone_prefixe}${cel_phone_num}`
    : cel_phone_num ?? ''

  const details: PaymentDetails = {
    transactionId: cpm_trans_id,
    amount:        parseFloat(cpm_amount),
    currency:      cpm_currency ?? 'XAF',
    status:        cpm_result === '00' ? 'SUCCESS' : 'FAILED',
    paymentMethod: payment_method ?? '',
    phoneNumber,
    designation:   cpm_designation ?? '',
    errorMessage:  cpm_error_message ?? '',
    rawBody:       body,
  }

  console.log('[extractPaymentDetails]', {
    transactionId: details.transactionId,
    amount:        details.amount,
    status:        details.status,
    paymentMethod: details.paymentMethod,
    phoneNumber:   details.phoneNumber,
  })

  return details
}

// ---------------------------------------------------------------------------
// 3. Génération du QR code signé (délègue à qrGenerator)
// ---------------------------------------------------------------------------

/**
 * Orchestre la création des billets en base + génération des QR codes.
 * Retourne la liste des billets créés (ticket_id + qr_base64 + phone).
 */
async function generateSignedQRCode(
  paymentDetails: PaymentDetails
): Promise<CreatedTicketResult[]> {
  // Délègue entièrement à supabaseTicketManager :
  // - lookup de la transaction en base
  // - vérification du montant
  // - passage en PAID
  // - génération QR (via qrGenerator)
  // - insertion tickets
  // - incrémentation quantite_vendue
  return createTicketsForTransaction(paymentDetails)
}

// ---------------------------------------------------------------------------
// 4. Mise à jour Supabase (intégrée dans generateSignedQRCode)
// ---------------------------------------------------------------------------

/**
 * Alias explicite — la mise à jour Supabase est déjà effectuée par
 * createTicketsForTransaction dans generateSignedQRCode.
 * Cette fonction existe pour la lisibilité de la route principale.
 */
async function updateSupabaseWithTicket(
  _paymentDetails: PaymentDetails,
  _tickets: CreatedTicketResult[]
): Promise<void> {
  // Déjà réalisé dans generateSignedQRCode → createTicketsForTransaction.
  // Rien à faire ici. Conserver la fonction pour la lisibilité du flux.
}

// ---------------------------------------------------------------------------
// 5. Envoi SMS (placeholder — sera implémenté à la prochaine étape)
// ---------------------------------------------------------------------------

/**
 * Envoie un SMS avec le lien ou l'image du billet à l'acheteur.
 * Prochain step : intégration API SMS Orange RCA / autre fournisseur.
 */
async function sendSMSTicket(
  recipient: string,
  ticketContent: string
): Promise<void> {
  // TODO: appeler l'API SMS avec le numéro et le contenu du billet
  console.log(`[sendSMSTicket] → ${recipient} | ticket: ${ticketContent.slice(0, 60)}...`)
}

// ---------------------------------------------------------------------------
// 6. Placeholder — création d'événement depuis webhook
// ---------------------------------------------------------------------------

async function createEventEntryInSupabase(
  eventDetails: Record<string, unknown>
): Promise<void> {
  console.log('[createEventEntryInSupabase] eventDetails:', eventDetails)
}

// ---------------------------------------------------------------------------
// Route principale POST
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // 1. Lecture du body brut
    const body = (await req.json()) as CinetPayWebhookBody

    // 2. Log complet pour le débogage
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => { headers[key] = value })

    console.log('═══════════════════════════════════════')
    console.log(`[CinetPay Webhook - ${new Date().toISOString()}] Requête reçue`)
    console.log('[Headers]', JSON.stringify(headers, null, 2))
    console.log('[Body]   ', JSON.stringify(body, null, 2))
    console.log('═══════════════════════════════════════')

    // 2.1 Verification Site ID
    if (body.cpm_site_id !== process.env.CINETPAY_SITE_ID) {
      console.warn(`[CinetPay Webhook] cpm_site_id mismatch: ${body.cpm_site_id}`);
      return NextResponse.json({ message: 'Site ID mismatch.' }, { status: 200 });
    }

    // 3. Vérification HMAC
    const isValid = await verifyCinetPaySignature(headers, body)
    if (!isValid) {
      console.warn('[CinetPay Webhook] Signature invalide — requête rejetée.')
      return NextResponse.json({ message: 'Signature invalide.' }, { status: 200 })
    }

    // 4. Extraction des détails du paiement
    let paymentDetails: PaymentDetails
    try {
      paymentDetails = await extractPaymentDetails(body)
    } catch (extractErr) {
      console.error('[CinetPay Webhook] Erreur extraction:', extractErr)
      return NextResponse.json({ message: 'Body invalide.' }, { status: 200 })
    }

    // 5. Ignorer les paiements non réussis
    if (paymentDetails.status !== 'SUCCESS') {
      console.log(`[CinetPay Webhook] Paiement non réussi (${body.cpm_result}) — tx ${paymentDetails.transactionId}`)
      return NextResponse.json(
        { message: `Paiement non réussi : ${paymentDetails.errorMessage}` },
        { status: 200 }
      )
    }

    // 6. Génération des QR codes + mise à jour Supabase
    let createdTickets: CreatedTicketResult[]
    try {
      createdTickets = await generateSignedQRCode(paymentDetails)
    } catch (qrErr) {
      console.error('[CinetPay Webhook] Erreur génération QR / Supabase:', qrErr)
      // On retourne 200 pour éviter la boucle de retry CinetPay,
      // mais on logue l'erreur pour traitement manuel si nécessaire.
      return NextResponse.json(
        { message: 'Erreur interne lors de la création des billets.' },
        { status: 200 }
      )
    }

    // 7. Mise à jour Supabase (déjà effectuée — appel explicite pour clarté)
    await updateSupabaseWithTicket(paymentDetails, createdTickets)

    // 8. Envoi SMS pour chaque billet créé
    if (createdTickets.length > 0) {
      for (const ticket of createdTickets) {
        await sendSMSTicket(ticket.phone_number, ticket.qr_raw_string)
      }
      console.log(`[CinetPay Webhook] ${createdTickets.length} SMS envoyé(s) au ${paymentDetails.phoneNumber}`)
    }

    // 9. Réponse 200 obligatoire
    return NextResponse.json(
      { message: 'Webhook CinetPay traité avec succès.', tickets_created: createdTickets.length },
      { status: 200 }
    )

  } catch (err) {
    console.error('[CinetPay Webhook] Erreur inattendue:', err)
    return NextResponse.json({ message: 'Erreur serveur.' }, { status: 200 })
  }
}
