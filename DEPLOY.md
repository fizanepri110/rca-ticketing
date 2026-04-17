# 🚀 Déploiement RCA Ticketing sur Vercel

## Étape 1 — Récupérer les clés manquantes

### Supabase Service Role Key
1. Va sur https://supabase.com/dashboard/project/zzbwrltzlhcqkwdtwlux/settings/api
2. Copie la **Service role key** (commence par `eyJ...`)

### CinetPay (plus tard)
1. Va sur https://dashboard.cinetpay.com
2. Récupère : `API Key`, `Site ID`, `Secret Key`

---

## Étape 2 — Installer Node.js et Vercel CLI sur ton ordinateur

```bash
# Installer Vercel CLI (une seule fois)
npm install -g vercel
```

---

## Étape 3 — Déployer

```bash
# Dans le dossier du projet rca-ticketing
cd /chemin/vers/rca-ticketing

# Login Vercel (une seule fois)
vercel login

# Déployer (répond aux questions : framework = Next.js)
vercel deploy --prod
```

---

## Étape 4 — Ajouter les variables d'environnement sur Vercel

Sur https://vercel.com/nel667s-projects/rca-ticketing/settings/environment-variables, ajoute :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zzbwrltzlhcqkwdtwlux.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (déjà dans .env.local) |
| `SUPABASE_SERVICE_ROLE_KEY` | ← ta clé service role Supabase |
| `CINETPAY_API_KEY` | ← ta clé API CinetPay |
| `CINETPAY_SITE_ID` | ← ton site ID CinetPay |
| `CINETPAY_SECRET_KEY` | ← ta clé secrète CinetPay |
| `TICKET_SECRET_KEY` | `rca-ticketing-secret-qr-key-2025-bangui` |
| `NEXT_PUBLIC_APP_URL` | `https://rca-ticketing.vercel.app` (ton URL Vercel) |

## Étape 5 — Redéployer après avoir ajouté les variables

```bash
vercel deploy --prod
```

## Étape 6 — Mettre à jour le webhook CinetPay

Sur le dashboard CinetPay, configure l'URL de notification :
```
https://ton-url.vercel.app/api/webhook/cinetpay
```
