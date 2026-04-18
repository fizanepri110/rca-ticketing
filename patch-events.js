const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/events/new/page.tsx', 'utf8');

code = code.replace(
  "import { supabaseBrowser } from '@/lib/supabase-browser'",
  "import { supabaseBrowser } from '@/lib/supabase-browser'\nimport { createEventAction } from './actions'"
);

const oldBlock = `// 3. Appel RPC create_event_with_tickets`;
const startIndex = code.indexOf(oldBlock);
const endIndex = code.indexOf('} catch (err) {');

if(startIndex !== -1 && endIndex !== -1) {
    const replacement = `// 3. Appel Server Action
      const res = await createEventAction({
        titre: titre.trim(),
        description: description.trim(),
        lieu: lieu.trim(),
        date: isoDate,
        image_url: finalImageUrl,
        statut: statut,
        capacite_totale: tickets.reduce((sum, t) => sum + parseInt(t.quantite_max || '0'), 0),
        ticket_types: tickets.map((t) => ({
          nom: t.nom.trim(),
          prix: parseInt(t.prix),
          quantite_max: parseInt(t.quantite_max),
        })),
      })

      if (res.error) throw new Error(res.error)

      // 4. Redirection vers le dashboard avec message de succès
      router.push(\`/dashboard?created=\${res.eventId}\`)
    `;
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('src/app/dashboard/events/new/page.tsx', code);
    console.log("OK");
} else {
    console.error("NOT FOUND");
}