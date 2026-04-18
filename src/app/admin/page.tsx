import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerProfile } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import AdminClient from './AdminClient'

async function AdminData() {
  const profile = await getServerProfile()

  if (!profile) redirect('/login?redirect=/admin')
  if (profile.role !== 'admin') redirect('/?error=acces_refuse')

  // Fetch events pending validation
  const { data: pendingEvents } = await supabaseAdmin
    .from('events')
    .select('id, titre, lieu, date, statut, created_at, profiles!organisateur_id(nom, email)')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false })

  // Fetch all events
  const { data: allEvents } = await supabaseAdmin
    .from('events')
    .select('id, titre, lieu, date, statut, created_at, profiles!organisateur_id(nom, email)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AdminClient 
      profile={profile} 
      pendingEvents={pendingEvents ?? []} 
      allEvents={allEvents ?? []} 
    />
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminData />
    </Suspense>
  )
}
