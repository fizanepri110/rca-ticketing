import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerProfile } from '@/lib/auth'
import DashboardClient from './DashboardClient'
import { supabaseAdmin } from '@/lib/supabase'

async function DashboardData() {
  const profile = await getServerProfile()

  if (!profile) redirect('/login?redirect=/dashboard')
  if (profile.role !== 'organisateur') redirect('/?error=acces_refuse')

  const [eventsResult, statsResult, controlleursResult] = await Promise.all([
    supabaseAdmin
      .from('events')
      .select('id, titre, lieu, date, statut')
      .eq('organisateur_id', profile.id)
      .order('date', { ascending: false }),

    supabaseAdmin.rpc('get_organisateur_stats', { p_organisateur_id: profile.id }),

    supabaseAdmin
      .from('controleurs')
      .select('id, telephone, nom, created_at')
      .eq('organisateur_id', profile.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <DashboardClient
      profile={profile}
      events={eventsResult.data ?? []}
      stats={statsResult.data ?? { total_ventes: 0, billets_vendus: 0, billets_scannes: 0 }}
      controleurs={controlleursResult.data ?? []}
    />
  )
}

export default function DashboardPage() {
  // Suspense requis car DashboardClient utilise useSearchParams()
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardData />
    </Suspense>
  )
}
