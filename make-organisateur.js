// IMPORTANT: Set environment variables before running this script
// Required env vars:
// - NEXT_PUBLIC_SUPABASE_URL (e.g., https://zzbwrltzlhcqkwdtwlux.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (e.g., sb_secret_...)

const { createClient } = require('@supabase/supabase-js');

// On utilise la SERVICE_ROLE_KEY pour avoir les droits administrateur et bypasser le RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setOrganisateur() {
  const emailToUpdate = process.argv[2];

  if (!emailToUpdate) {
    console.error('Erreur: Veuillez fournir une adresse email.');
    console.log('Utilisation: node make-organisateur.js mon-email@exemple.com');
    process.exit(1);
  }

  console.log(`Recherche du compte ${emailToUpdate}...`);

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'organisateur' })
    .eq('email', emailToUpdate)
    .select();

  if (error) {
    console.error('Erreur lors de la mise à jour:', error);
  } else if (data && data.length > 0) {
    console.log('✅ Succès ! Ce compte est maintenant un organisateur.');
    console.log(data[0]);
  } else {
    console.log('❌ Compte introuvable. Assurez-vous de vous être inscrit sur l\'appli en premier.');
  }
}

setOrganisateur();