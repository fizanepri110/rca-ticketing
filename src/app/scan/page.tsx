import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth'
import ScanClient from './ScanClient'

export default async function ScanPage() {
  const profile = await getServerProfile()

  if (!profile) {
    redirect('/login?redirect=/scan')
  }

  // Accessible aux contrôleurs ET aux organisateurs (qui peuvent aussi scanner)
  if (profile.role !== 'controleur' && profile.role !== 'organisateur') {
    redirect('/?error=acces_refuse')
  }

  return <ScanClient controleurNom={profile.nom || profile.email} />
}
