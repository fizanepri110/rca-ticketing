const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/register/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Expression régulière pour capturer le bloc d'insertion et la gestion d'erreur qui suit
const regex = /\/\/ 2\. Insertion du profil dans la table profiles[\s\S]*?(?=router\.push\('\/'\))/m;

const newCode = `// 2. Insertion ou mise à jour du profil (Upsert)
    const { error: profileError } = await supabaseBrowser
      .from('profiles')
      .upsert({
        id:        data.user.id,
        email:     email,
        nom:       nom.trim(),
        telephone: phone,
        role:      'client',
      }, { onConflict: 'id' })

    if (profileError) {
      console.warn('Upsert profile error (ignoring to allow login):', profileError.message)
      // On logue l'erreur mais on ne bloque pas la redirection.
      // Si le trigger a fait le job ou qu'il y a un souci RLS temporaire,
      // l'utilisateur est de toute façon bien enregistré dans auth.users.
    }

    `;

if (regex.test(content)) {
  content = content.replace(regex, newCode);
  fs.writeFileSync(file, content);
  console.log('✅ src/app/register/page.tsx mis à jour avec upsert()');
} else {
  console.error('❌ Impossible de trouver le bloc à remplacer dans page.tsx');
}