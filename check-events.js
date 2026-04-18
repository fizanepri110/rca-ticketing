// IMPORTANT: Set environment variables before running this script
// Required env vars:
// - NEXT_PUBLIC_SUPABASE_URL (e.g., https://zzbwrltzlhcqkwdtwlux.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (e.g., sb_secret_...)

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function getEvents() {
  const { data } = await supabase.from('events').select('id, titre, statut');
  console.log(data);
}
getEvents();