const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/events/new/page.tsx', 'utf8');

// replace the state type and default
code = code.replace(
  "const [statut, setStatut]       = useState<'brouillon' | 'publie'>('brouillon')",
  "const [statut, setStatut]       = useState<'brouillon' | 'en_attente'>('brouillon')"
);

// replace the buttons mapping
code = code.replace(
  "(['brouillon', 'publie'] as const).map((s) => (",
  "(['brouillon', 'en_attente'] as const).map((s) => ("
);

// replace specific occurrences of 'publie' logic
code = code.replace(
  "s === 'publie'",
  "s === 'en_attente'"
);
code = code.replace(
  "{s === 'brouillon' ? '📝 Brouillon' : '🚀 Publier maintenant'}",
  "{s === 'brouillon' ? '📝 Brouillon' : '🚀 Soumettre pour validation'}"
);
code = code.replace(
  "{statut === 'publie' ? '🚀 Publié' : '📝 Brouillon'}",
  "{statut === 'en_attente' ? '⏳ En attente' : '📝 Brouillon'}"
);
code = code.replace(
  "{statut === 'publie' ? 'Publier l\\'événement' : 'Enregistrer en brouillon'}",
  "{statut === 'en_attente' ? 'Soumettre l\\'événement' : 'Enregistrer en brouillon'}"
);

// also update the preview card
code = code.replace(
  "statut === 'publie' ? 'bg-green-400 text-green-900'",
  "statut === 'en_attente' ? 'bg-yellow-400 text-yellow-900'"
);

fs.writeFileSync('src/app/dashboard/events/new/page.tsx', code);
console.log("Updated events/new/page.tsx");
