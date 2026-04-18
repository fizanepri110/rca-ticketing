import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type UserRole = 'client' | 'organisateur' | 'controleur' | 'admin'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  telephone: string
  nom: string
}

/**
 * Récupère le profil de l'utilisateur connecté côté serveur.
 * Retourne null si non connecté ou si le profil n'existe pas.
 */
export async function getServerProfile(): Promise<UserProfile | null> {
  // NE PAS METTRE DE TRY/CATCH GLOBAL ICI !
  // Next.js a besoin que `await cookies()` lance une exception spécifique en mode build
  // pour basculer la route en rendu dynamique (SSR). Si on l'attrape, on casse le SSR.
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore les erreurs de cookies en lecture seule (Server Components).
            // Les cookies ne peuvent être modifiés que dans les Server Actions ou Route Handlers.
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, telephone, nom')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: profile.id,
    email: profile.email ?? user.email ?? '',
    role: (profile.role as UserRole) ?? 'client',
    telephone: profile.telephone ?? '',
    nom: profile.nom ?? '',
  }
}
