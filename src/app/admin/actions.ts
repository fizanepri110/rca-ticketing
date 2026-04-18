'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { getServerProfile } from '@/lib/auth'

export async function validateEventAction(eventId: string, newStatut: 'publie' | 'brouillon') {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Accès refusé' }
  }

  const { error } = await supabaseAdmin
    .from('events')
    .update({ statut: newStatut })
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }
  return { success: true }
}
