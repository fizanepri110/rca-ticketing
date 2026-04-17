import QRCode from 'qrcode'
import { createHmac } from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Payload encodé dans le QR code de chaque billet.
 * Ce JSON est signé HMAC-SHA256 pour garantir son authenticité.
 * Le controleur scannera ce QR et enverra le payload à /api/scan.
 */
export interface TicketQRPayload {
  ticket_id: string   // UUID du billet (créé avant la génération du QR)
  client_id: string   // UUID de l'acheteur (user_id dans Supabase)
  event_id: string    // UUID de l'événement
  issued_at: string   // ISO 8601 — horodatage d'émission
  secret_hash: string // HMAC-SHA256 pour anti-falsification
}

/**
 * Résultat retourné par generateTicketQR :
 * le payload structuré + l'image QR en base64.
 */
export interface GeneratedTicket {
  ticket_id: string
  payload: TicketQRPayload
  qr_base64: string        // data:image/png;base64,...
  qr_raw_string: string    // JSON brut encodé dans le QR (pour /api/scan)
}

// ---------------------------------------------------------------------------
// Constante de la clé secrète
// ---------------------------------------------------------------------------

/**
 * Clé secrète utilisée pour signer le QR code.
 * En production : TICKET_SECRET_KEY dans le .env
 * En développement : clé simulée si la variable n'est pas définie.
 */
function getTicketSecretKey(): string {
  const key = process.env.TICKET_SECRET_KEY
  if (!key) {
    console.warn('[qrGenerator] TICKET_SECRET_KEY non défini — utilisation de la clé simulée.')
    return 'TICKET_SECRET_KEY_SIMULATED_32_CHARS_MIN'
  }
  return key
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Génère un QR code signé pour un billet unique.
 *
 * Algorithme :
 * 1. Construit la chaîne à signer : ticket_id + client_id + event_id
 * 2. Crée le HMAC-SHA256 avec TICKET_SECRET_KEY
 * 3. Assemble le payload JSON (avec la signature)
 * 4. Génère l'image QR en base64 depuis ce JSON
 *
 * Ce payload est ensuite vérifié à l'entrée par /api/scan
 * (qui recrée le hash et compare).
 *
 * @param ticketId  UUID du billet (doit être unique)
 * @param clientId  UUID de l'utilisateur Supabase
 * @param eventId   UUID de l'événement
 */
export async function generateTicketQR(
  ticketId: string,
  clientId: string,
  eventId: string
): Promise<GeneratedTicket> {
  const issuedAt = new Date().toISOString()
  const secretKey = getTicketSecretKey()

  // 1. Signature HMAC-SHA256 (même algorithme que dans /api/scan)
  const secretHash = createHmac('sha256', secretKey)
    .update(`${ticketId}${clientId}${eventId}`)
    .digest('hex')

  // 2. Payload complet du billet
  const payload: TicketQRPayload = {
    ticket_id: ticketId,
    client_id: clientId,
    event_id: eventId,
    issued_at: issuedAt,
    secret_hash: secretHash,
  }

  // 3. Sérialisation JSON du payload
  const qrRawString = JSON.stringify(payload)

  // 4. Génération de l'image QR en base64 (PNG)
  const qrBase64 = await QRCode.toDataURL(qrRawString, {
    errorCorrectionLevel: 'H', // Haute résistance aux erreurs (utile si QR partiellement caché)
    margin: 2,
    width: 300,
    color: {
      dark: '#1e3a5f',   // Bleu marine — couleur de la marque RCA Ticketing
      light: '#ffffff',
    },
  })

  console.log(`[qrGenerator] QR généré pour ticket_id=${ticketId}`)

  return {
    ticket_id: ticketId,
    payload,
    qr_base64: qrBase64,
    qr_raw_string: qrRawString,
  }
}
