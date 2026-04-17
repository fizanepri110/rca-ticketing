import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type UserRole = 'client' | 'organisateur' | 'controleur'

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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
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

  return profile ?? null
}
