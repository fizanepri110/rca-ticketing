const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/register/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// replace signUp call
content = content.replace(
  /supabaseBrowser\.auth\.signUp\(\{\s+email,\s+password,\s+\}\)/m,
  `supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: nom.trim(),
          telephone: phone,
          role: 'client'
        }
      }
    })`
);

fs.writeFileSync(file, content);
console.log('Fixed signUp metadata in register page');
