# Prompt pour déployer et tester RCA Ticketing

## Contexte du projet

RCA Ticketing est une plateforme de billetterie en ligne pour la République Centrafricaine.
Stack : **Next.js 16.2.1** + **Supabase** + **CinetPay** (Mobile Money XAF).

Le code est corrigé, TypeScript compile à 0 erreurs, la base Supabase est prête.
Il faut maintenant **déployer sur Vercel** et **tester le flux complet**.

---

## ÉTAPE 1 : Déploiement sur Vercel

### 1.1 — Push le code sur GitHub (si pas déjà fait)

```bash
git add -A
git commit -m "fix: audit complet + corrections critiques (checkout RPC, transaction status, QR codes, paid_at)"
git push origin main
```

### 1.2 — Déployer sur Vercel

Si le projet n'est pas encore lié à Vercel :
```bash
npx vercel --prod
```

Ou via le dashboard Vercel : importer le repo GitHub.

### 1.3 — Variables d'environnement Vercel

Ajouter ces variables dans Vercel → Settings → Environment Variables :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (https://zzbwrltzlhcqkwdtwlux.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase (commence par `eyJ...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase (commence par `eyJ...`) |
| `CINETPAY_API_KEY` | Clé API CinetPay |
| `CINETPAY_SITE_ID` | Site ID CinetPay |
| `CINETPAY_SECRET_KEY` | Clé secrète CinetPay pour vérifier les webhooks |
| `TICKET_SECRET_KEY` | Clé secrète pour signer les QR codes HMAC-SHA256 (au moins 32 caractères) |
| `NEXT_PUBLIC_APP_URL` | URL de production Vercel (ex: `https://rca-ticketing.vercel.app`) |

**IMPORTANT** : Les valeurs sont dans le fichier `.env.local` du projet. Ne les invente pas.

### 1.4 — Vérifier le déploiement

Après déploiement, vérifier que ces pages répondent (HTTP 200) :
- `https://<URL>/` — Page d'accueil avec événements
- `https://<URL>/login` — Page de connexion
- `https://<URL>/register` — Page d'inscription

---

## ÉTAPE 2 : Tests manuels du flux complet

### Test 1 — Inscription client
1. Aller sur `/register`
2. Créer un compte : nom "Test Client", email `test-client-deploy@test.com`, téléphone `+23672000001`, mot de passe `test123456`
3. **Vérifier** : redirection vers `/` (accueil)
4. **Vérifier** : le bouton "Mes billets" apparaît dans le header

### Test 2 — Navigation événements
1. Sur la page d'accueil, cliquer sur un événement (ex: "Nuit de la Musique Centrafricaine")
2. **Vérifier** : la page `/events/[id]` s'affiche avec le titre, lieu, date, description
3. **Vérifier** : les catégories de billets s'affichent avec les prix
4. **Vérifier** : le sélecteur de quantité fonctionne (+/-)

### Test 3 — Processus d'achat (checkout)
1. Sélectionner une catégorie de billet
2. Entrer un numéro Mobile Money : `72000001`
3. Cliquer "Acheter mon billet"
4. **Vérifier** : redirection vers la page de paiement CinetPay
5. En mode sandbox CinetPay, confirmer le paiement
6. **Vérifier** : retour sur `/payment/success` avec la référence de transaction

### Test 4 — Vérification des billets
1. Aller sur `/mes-billets`
2. **Vérifier** : le billet acheté apparaît avec statut "Valide" (vert)
3. Cliquer "Afficher le QR code"
4. **Vérifier** : un vrai QR code s'affiche (image, pas une icône placeholder)
5. Scanner le QR code avec un lecteur QR externe → **Vérifier** que le JSON contient `ticket_id`, `client_id`, `event_id`, `issued_at`, `secret_hash`

### Test 5 — Dashboard organisateur
1. Se connecter avec un compte organisateur (email: `fizanenelson5@gmail.com`)
2. **Vérifier** : redirection vers `/dashboard`
3. **Vérifier** : les stats (ventes, billets vendus, affluence) s'affichent
4. **Vérifier** : la liste des événements apparaît avec les bons statuts
5. Cliquer "Nouvel événement" → remplir les 3 étapes → soumettre
6. **Vérifier** : l'événement apparaît avec statut "En attente" (jaune)

### Test 6 — Dashboard admin
1. Se connecter avec un compte admin
2. **Vérifier** : redirection vers `/admin`
3. L'événement soumis à l'étape 5 apparaît dans "En attente de validation"
4. Cliquer "Valider"
5. **Vérifier** : l'événement passe à "Publié" et apparaît sur la page d'accueil

### Test 7 — Scanner de billets
1. Se connecter avec un compte contrôleur ou organisateur
2. **Vérifier** : redirection vers `/scan`
3. **Vérifier** : la caméra se lance avec le viseur QR
4. Scanner le QR code d'un billet "paye"
5. **Vérifier** : overlay VERT "VALIDE" avec catégorie et nom de l'événement
6. Re-scanner le même QR code
7. **Vérifier** : overlay ROUGE "REFUSÉ — Billet déjà utilisé"

---

## ÉTAPE 3 : Tests API avec curl

Si tu peux exécuter des commandes, voici les tests API :

```bash
# Variable de base
BASE_URL="https://<URL_VERCEL>"

# Test 1 — Homepage (doit retourner 200 avec du HTML)
curl -s -o /dev/null -w "Homepage: HTTP %{http_code}\n" "$BASE_URL/"

# Test 2 — API checkout sans auth (doit retourner 401)
curl -s -w "\nCheckout sans auth: HTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{"event_id":"test","ticket_type_id":"test","quantity":1,"phone_number":"+23672000001"}'

# Test 3 — API scan avec un faux QR (doit retourner 400 ou 404)
curl -s -w "\nScan faux QR: HTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"ticket_id":"fake","event_id":"fake","secret_hash":"fake","issued_at":"2024-01-01"}'

# Test 4 — Webhook CinetPay sans signature (doit retourner 200 mais "Signature invalide")
curl -s -w "\nWebhook sans signature: HTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/webhook/cinetpay" \
  -H "Content-Type: application/json" \
  -d '{"cpm_site_id":"wrong","cpm_trans_id":"test","cpm_amount":"1000"}'
```

**Résultats attendus :**
- Homepage → 200
- Checkout sans auth → 401 + `"Vous devez être connecté"`
- Scan faux QR → 404 + `"Billet introuvable"`
- Webhook sans signature → 200 + `"Site ID mismatch"` ou `"Signature invalide"`

---

## Architecture résumée

```
src/
├── app/
│   ├── page.tsx                    # Accueil (événements publiés)
│   ├── login/page.tsx              # Connexion
│   ├── register/page.tsx           # Inscription
│   ├── events/[id]/                # Détail événement + achat
│   ├── mes-billets/                # Billets du client (QR codes)
│   ├── payment/success/            # Confirmation paiement
│   ├── dashboard/                  # Dashboard organisateur
│   │   └── events/new/             # Création événement (3 étapes)
│   │   └── events/[id]/edit/       # Modification événement
│   ├── admin/                      # Validation admin
│   ├── scan/                       # Scanner QR (contrôleur)
│   └── api/
│       ├── checkout/route.ts       # Initie le paiement CinetPay
│       ├── webhook/cinetpay/route.ts # Webhook post-paiement
│       ├── scan/route.ts           # Validation QR + anti-fraude
│       └── controleurs/route.ts    # CRUD contrôleurs
├── lib/
│   ├── supabase.ts                 # Client Supabase admin (serveur)
│   ├── supabase-browser.ts         # Client Supabase (navigateur)
│   ├── auth.ts                     # Helper auth serveur
│   ├── cinetpay.ts                 # Initialisation paiement CinetPay
│   ├── qrGenerator.ts             # Génération QR HMAC-SHA256
│   └── supabaseTicketManager.ts   # Logique post-paiement
└── components/
    └── TicketSelector.tsx          # Sélecteur de billet
```

## Tables Supabase

- `profiles` (id, nom, email, telephone, role: client|organisateur|controleur|admin)
- `events` (id, titre, description, lieu, date, image_url, statut: brouillon|en_attente|publie|termine|annule, organisateur_id)
- `tickets_types` (id, event_id, nom, prix, quantite_max, quantite_vendue) — table de base
- `ticket_types` — VUE sur tickets_types (même colonnes)
- `transactions` (id, user_id, event_id, ticket_type_id, quantity, amount, phone_number, operator, status: PENDING|SUCCESS|FAILED|CANCELLED, paid_at, cinetpay_ref)
- `tickets` (id, ticket_type_id, client_id, transaction_id, secret_hash, status: paye|utilise|annule, scanned_at)
- `controleurs` (id, organisateur_id, nom, telephone)

## RPC Functions

- `check_and_reserve_tickets(p_ticket_type_id, p_quantity)` → TABLE(available, unit_price, event_title, organizer_name)
- `increment_tickets_sold(p_ticket_type_id, p_quantity)` → void
- `get_organisateur_stats(p_organisateur_id)` → {total_ventes, billets_vendus, billets_scannes}
- `handle_new_user()` — trigger on auth.users insert

## Points d'attention

1. **NEXT_PUBLIC_APP_URL** doit correspondre exactement à l'URL Vercel (utilisé pour le webhook CinetPay)
2. **CinetPay notify_url** : CinetPay doit pouvoir POST sur `<APP_URL>/api/webhook/cinetpay`
3. **Next.js 16** : les `params` dans les pages dynamiques sont des `Promise` (pas d'accès direct `params.id`)
4. Les données de test existantes ont des `secret_hash` de 32 chars (MD5) — les vrais tickets générés par le webhook utiliseront SHA-256 (64 chars)
