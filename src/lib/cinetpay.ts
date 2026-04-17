export interface CinetPayInitPayload {
  transaction_id: string
  amount: number
  currency?: string
  description: string
  notify_url: string
  return_url: string
  customer_name: string
  customer_surname: string
  customer_phone_number: string
  customer_email: string
  customer_address?: string
  customer_city?: string
  customer_country?: string
  customer_state?: string
  customer_zip_code?: string
}

export interface CinetPayInitResponse {
  code: string
  message: string
  data?: {
    payment_url: string
  }
}

export async function initCinetPayTransaction(
  payload: CinetPayInitPayload
): Promise<CinetPayInitResponse> {
  // TODO: Remplacer par le vrai Site ID trouvé dans CinetPay > Solution
  const siteId = process.env.CINETPAY_SITE_ID && process.env.CINETPAY_SITE_ID !== 'INCONNU_A_TROUVER' 
    ? process.env.CINETPAY_SITE_ID 
    : '5873744';

  const apiKey = process.env.CINETPAY_API_KEY && process.env.CINETPAY_API_KEY !== 'ta_cle_api_cinetpay'
    ? process.env.CINETPAY_API_KEY
    : 'sk_test_Ch1nj2FVWRFNlyNL5Mx57exH';

  const body = {
    apikey: apiKey,
    site_id: siteId,
    ...payload,
    currency: payload.currency || 'XAF',
    customer_address: payload.customer_address || 'Bangui',
    customer_city: payload.customer_city || 'Bangui',
    customer_country: payload.customer_country || 'CF',
    customer_state: payload.customer_state || 'CF',
    customer_zip_code: payload.customer_zip_code || '00000',
    channels: 'MOBILE_MONEY',
    lang: 'fr',
  }

  // URL CinetPay API (sandbox ou prod)
  // En modifiant ceci si on est en prod plus tard.
  const apiUrl = 'https://api-checkout.cinetpay.com/v2/payment'

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text();
    console.error('--- ERREUR HTTP CINETPAY ---');
    console.error(errorText);
    throw new Error(`CinetPay HTTP error: ${res.status} - ${errorText}`);
  }

  const jsonResponse = await res.json();
  console.log('--- REPONSE CINETPAY ---');
  console.log(JSON.stringify(jsonResponse, null, 2));
  
  if (jsonResponse.code !== '201') {
    console.error('--- ERREUR API CINETPAY ---', jsonResponse.message, jsonResponse.description);
  }
  
  return jsonResponse;
}
