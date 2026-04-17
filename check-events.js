const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://zzbwrltzlhcqkwdtwlux.supabase.co',
  'sb_secret_IyDD4sb1N9pCO22yige-xg_bc5gahs0'
);
async function getEvents() {
  const { data } = await supabase.from('events').select('id, titre, statut');
  console.log(data);
}
getEvents();