// IMPORTANT: Set environment variables before running this script
// Required env vars:
// - NEXT_PUBLIC_SUPABASE_URL (e.g., https://zzbwrltzlhcqkwdtwlux.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (e.g., sb_secret_...)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetUser() {
  const targetEmail = 'fizanenelson5@gmail.com';
  console.log(`Recherche de l'utilisateur ${targetEmail}...`);

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Erreur lors de la récupération des utilisateurs:', usersError);
    return;
  }

  const user = usersData.users.find(u => u.email === targetEmail);

  if (user) {
    console.log(`Utilisateur trouvé (ID: ${user.id}). Suppression en cours...`);
    // auth.admin.deleteUser supprime en cascade dans public.profiles selon la configuration par défaut de Supabase
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (delError) {
      console.error('Erreur lors de la suppression de l\'utilisateur auth:', delError);
    } else {
      console.log('✅ Utilisateur supprimé avec succès de auth.users !');
    }
    
    // Au cas où la cascade ne serait pas activée, on nettoie aussi manuellement
    const { error: profError } = await supabase.from('profiles').delete().eq('id', user.id);
    if (!profError) {
       console.log('✅ Nettoyage de public.profiles effectué (si applicable).');
    }

  } else {
    console.log('L\'utilisateur n\'a pas été trouvé dans Supabase Auth.');
  }
}

resetUser();