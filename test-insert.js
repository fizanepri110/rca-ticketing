const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabase = createClient(
  'https://zzbwrltzlhcqkwdtwlux.supabase.co',
  'sb_secret_IyDD4sb1N9pCO22yige-xg_bc5gahs0'
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