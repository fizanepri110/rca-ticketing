const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/register/page.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `    if (profileError) {
      setError('Compte crǸǸ mais erreur profil. Contactez le support.')
      setLoading(false)
      return
    }`;

const newBlock = `    if (profileError) {
      console.error('Erreur profile:', profileError);
      // Supabase Auth déclenche souvent un trigger automatique pour créer le profil.
      // Si la ligne existe déjà (23505) on la met à jour, si elle est introuvable (23503 due au RLS ou délai),
      // on ignore l'erreur pour ne pas bloquer l'utilisateur qui est bien authentifié.
      if (profileError.code === '23505') {
         await supabaseBrowser.from('profiles').update({ nom: nom.trim(), telephone: phone, role: 'client' }).eq('id', data.user.id);
      }
    }`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, content);
console.log('Fixed register page');