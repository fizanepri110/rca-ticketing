import fetch from 'node-fetch';

const apiUrl = 'https://api-checkout.cinetpay.com/v2/payment';
const body = {
  apikey: 'sk_test_Ch1nj2FVWRFNlyNL5Mx57exH',
  site_id: '5873744',
  transaction_id: 'test-trans-' + Math.floor(Math.random() * 1000000),
  amount: 100,
  currency: 'XAF',
  description: 'Test Achat',
  notify_url: 'http://localhost:3000/api/webhook/cinetpay',
  return_url: 'http://localhost:3000/payment/success',
  customer_name: 'Test',
  customer_surname: 'User',
  customer_phone_number: '23672000000',
  customer_email: 'test@example.com',
  customer_address: 'Bangui',
  customer_city: 'Bangui',
  customer_country: 'CF',
  customer_state: 'CF',
  customer_zip_code: '00000',
  channels: 'MOBILE_MONEY',
  lang: 'fr',
};

async function run() {
  console.log('Sending request to CinetPay...');
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    console.error('HTTP Error:', res.status);
    console.error(await res.text());
    return;
  }
  
  const json = await res.json();
  console.log('--- REPONSE CINETPAY ---');
  console.log(JSON.stringify(json, null, 2));
}

run();