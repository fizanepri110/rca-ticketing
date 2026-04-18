const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/events/[id]/edit/page.tsx', 'utf8');

// replace the state type and default
code = code.replace(
  "const [statut, setStatut] = useState<'brouillon' | 'publie'>('brouillon')",
  "const [statut, setStatut] = useState<'brouillon' | 'en_attente' | 'publie'>('brouillon')"
);

code = code.replace(
  "(['brouillon', 'publie'] as const).map((s) => (",
  "(['brouillon', 'en_attente', 'publie'] as const).map((s) => ("
);

// update preview card colors
code = code.replace(
  "statut === 'publie' ? 'bg-green-400 text-green-900' : 'bg-gray-300 text-gray-700'",
  "statut === 'publie' ? 'bg-green-400 text-green-900' : statut === 'en_attente' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-300 text-gray-700'"
);

// update preview text
code = code.replace(
  "{statut === 'publie' ? '🚀 Publié' : '📝 Brouillon'}",
  "{statut === 'publie' ? '🚀 Publié' : statut === 'en_attente' ? '⏳ En attente' : '📝 Brouillon'}"
);

// update buttons inside the map
code = code.replace(
  "s === 'brouillon' ? '📝 Brouillon' : '🚀 Publié'",
  "s === 'brouillon' ? '📝 Brouillon' : s === 'en_attente' ? '⏳ En attente' : '🚀 Publié'"
);

fs.writeFileSync('src/app/dashboard/events/[id]/edit/page.tsx', code);
console.log("Updated events/[id]/edit/page.tsx");