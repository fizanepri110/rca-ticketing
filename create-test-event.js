// IMPORTANT: Set environment variables before running this script
// Required env vars:
// - NEXT_PUBLIC_SUPABASE_URL (e.g., https://zzbwrltzlhcqkwdtwlux.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (e.g., sb_secret_...)

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestEvent() {
  const eventId = randomUUID();
  const ticketTypeId = randomUUID();

  // On recupere le profil organisateur qu'on avait setup
  const { data: users } = await supabase.from('profiles').select('*').eq('role', 'organisateur');
  let orgId = users && users.length > 0 ? users[0].id : null;

  if (!orgId) {
    // on cree un user dummy pour ca
    orgId = randomUUID();
    await supabase.from('profiles').insert({
      id: orgId, email: 'org@test.com', nom: 'Org Test', telephone: '00', role: 'organisateur'
    });
  }

  // creation event
  const { error: evtErr } = await supabase.from('events').insert({
    id: eventId,
    organisateur_id: orgId,
    titre: 'Concert Test API',
    description: 'Evenement genere automatiquement',
    lieu: 'Stade de Bangui',
    date: new Date(Date.now() + 86400000).toISOString(), // demain
    statut: 'publie'
  });

  if (evtErr) {
    console.log('Error creating event', evtErr);
    return;
  }

  // creation ticket type
  const { error: tkErr } = await supabase.from('ticket_types').insert({
    id: ticketTypeId,
    event_id: eventId,
    nom: 'VIP',
    prix: 5000,
    quantite_totale: 100,
    quantite_vendue: 0
  });

  if (tkErr) {
    console.log('Error creating ticket type', tkErr);
  } else {
    console.log('Test event and ticket successfully created!');
  }
}

createTestEvent();