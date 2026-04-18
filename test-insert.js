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

async function testInsert() {
  const testId = randomUUID();
  console.log('Testing insert with ID:', testId);
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: testId,
      email: 'test@example.com',
      nom: 'Test User',
      telephone: '+23672000000',
      role: 'client'
    });
    
  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
    await supabase.from('profiles').delete().eq('id', testId);
  }
}

testInsert();