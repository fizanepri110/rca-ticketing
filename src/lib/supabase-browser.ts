import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase côté navigateur — utilisé dans les composants 'use client'.
 * Utilise uniquement la clé ANON (safe à exposer au browser).
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
