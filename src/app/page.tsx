import Link from 'next/link'
import Image from 'next/image'
import { Ticket, Shield, Smartphone, Calendar, MapPin } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerProfile } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EventCard {
  id: string
  titre: string
  lieu: string
  date: string
  image_url: string
  prix_min: number   // prix du billet le moins cher
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDateCourt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Server Component — fetch les événements publiés depuis Supabase
// ---------------------------------------------------------------------------
async function getPublishedEvents(): Promise<EventCard[]> {
  const { data: events } = await supabaseAdmin
    .from('events')
    .select(`
      id,
      titre,
      lieu,
      date,
      image_url,
      ticket_types ( prix )
    `)
    .eq('statut', 'publie')
    .gte('date', new Date().toISOString())   // Seulement les événements à venir
    .order('date', { ascending: true })
    .limit(20)

  if (!events) return []

  return events.map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prices = (e.ticket_types as any[])?.map((t: { prix: number }) => t.prix) ?? []
    const prix_min = prices.length > 0 ? Math.min(...prices) : 0

    return {
      id:       e.id,
      titre:    e.titre,
      lieu:     e.lieu,
      date:     e.date,
      image_url: e.image_url,
      prix_min,
    }
  })
}

// ---------------------------------------------------------------------------
// Page d'accueil
// ---------------------------------------------------------------------------
export default async function Home() {
  const events = await getPublishedEvents()
  const profile = await getServerProfile()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Ticket size={24} />
          <span className="font-bold text-lg">RCA Ticketing</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-blue-200 text-sm">Bangui, RCA</span>
          {profile ? (
            profile.role === 'client' && (
              <Link 
                href="/mes-billets" 
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-full transition shadow-sm"
              >
                🎟️ Mes billets
              </Link>
            )
          ) : (
            <Link 
              href="/login" 
              className="bg-white text-blue-700 border border-blue-600 hover:bg-blue-50 hover:shadow-md text-sm font-semibold px-4 py-2 rounded-full transition"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-6 py-16 text-center">
        <h1 className="text-3xl font-bold mb-3">Billetterie Digitale</h1>
        <p className="text-blue-200 mb-8 max-w-sm mx-auto">
          Achetez vos billets en ligne, payez avec Orange Money ou Moov Money.
        </p>
        {events.length > 0 && (
          <a
            href="#evenements"
            className="inline-block bg-yellow-400 text-blue-900 font-bold px-8 py-3 rounded-full hover:bg-yellow-300 transition"
          >
            Voir les événements
          </a>
        )}
      </section>

      {/* Liste des événements */}
      <section id="evenements" className="px-4 py-10 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          Événements à venir
        </h2>

        {events.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
            <Ticket size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              Aucun événement publié pour l&apos;instant.
              <br />Revenez bientôt !
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="relative w-full sm:w-40 h-40 sm:h-auto flex-shrink-0">
                  <Image
                    src={event.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=70'}
                    alt={event.titre}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Infos */}
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-bold text-gray-900 leading-snug mb-2">
                      {event.titre}
                    </h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} className="text-blue-500" />
                        <span>{formatDateCourt(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} className="text-blue-500" />
                        <span className="truncate">{event.lieu}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prix + CTA */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-semibold text-blue-700">
                      {event.prix_min > 0
                        ? `Dès ${event.prix_min.toLocaleString('fr-FR')} FCFA`
                        : 'Gratuit'}
                    </span>
                    <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full">
                      Acheter →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Fonctionnalités */}
      <section className="px-6 py-10 max-w-2xl mx-auto border-t border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-5 text-center">
          Pourquoi choisir RCA Ticketing ?
        </h2>
        <div className="grid gap-4">
          {[
            { icon: Smartphone, title: 'Mobile Money', desc: 'Payez avec Orange Money ou Moov Money depuis votre téléphone.' },
            { icon: Shield,     title: 'Anti-fraude',  desc: 'Chaque billet contient un QR code cryptographique unique.' },
            { icon: Ticket,     title: 'Instantané',   desc: 'Votre billet arrive par SMS en moins de 30 secondes.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm">
              <div className="bg-blue-100 rounded-xl p-3 flex-shrink-0">
                <Icon size={20} className="text-blue-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
