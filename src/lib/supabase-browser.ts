import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase côté navigateur — utilisé dans les composants 'use client'.
 * Utilise uniquement la clé ANON (safe à exposer au browser).
 * createBrowserClient synchronise la session dans les cookies (indispensable pour Next.js SSR).
 */
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
