const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://zzbwrltzlhcqkwdtwlux.supabase.co',
  'sb_secret_IyDD4sb1N9pCO22yige-xg_bc5gahs0'
);

async function checkSchema() {
  const { data, error } = await supabase.from('ticket_types').select('*').limit(1);
  console.log(data, error);
}
checkSchema();