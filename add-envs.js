const { execSync } = require('child_process');

const envs = {
  "NEXT_PUBLIC_SUPABASE_URL": "https://zzbwrltzlhcqkwdtwlux.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YndybHR6bGhjcWt3ZHR3bHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5ODYxMDAsImV4cCI6MjA3ODU2MjEwMH0.E3uEd93jnMo6IdqPO8R4vo7nvrNn1fZjY-lSH_unwsA",
  "SUPABASE_SERVICE_ROLE_KEY": "sb_secret_IyDD4sb1N9pCO22yige-xg_bc5gahs0",
  "CINETPAY_API_KEY": "sk_test_Ch1nj2FVWRFNlyNL5Mx57exH",
  "CINETPAY_SECRET_KEY": "RCA-tiketii 2026@",
  "CINETPAY_SITE_ID": "5873744",
  "TICKET_SECRET_KEY": "rca-ticketing-secret-qr-key-2025-bangui-rca",
  "NEXT_PUBLIC_APP_URL": "https://rca-ticketing.vercel.app"
};

const targets = ["production", "preview", "development"];

for (const [key, val] of Object.entries(envs)) {
  for (const target of targets) {
    try {
      console.log(`Adding ${key} for ${target}...`);
      // Use node to pipe the exact value without newlines
      execSync(`node -e "process.stdout.write('${val}')" | vercel env add ${key} ${target} --scope nel667s-projects`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to add ${key} for ${target}`);
    }
  }
}
