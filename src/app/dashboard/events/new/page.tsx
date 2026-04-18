'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft, Plus, Trash2, Upload, Loader2,
  Calendar, MapPin, FileText, Ticket, ImageIcon,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { createEventAction } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TicketTypeForm {
  id: string      // clé locale pour React (pas envoyé en base)
  nom: string
  prix: string    // string pour l'input, converti en number à la soumission
  quantite_max: string
}

type Step = 'infos' | 'billets' | 'recap'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'infos',   label: 'Infos',    icon: FileText },
  { id: 'billets', label: 'Billets',  icon: Ticket   },
  { id: 'recap',   label: 'Résumé',   icon: CheckCircle2 },
]

const TICKET_PRESETS = [
  { nom: 'Standard', prix: '5000',  couleur: 'bg-blue-50 border-blue-200'   },
  { nom: 'VIP',      prix: '15000', couleur: 'bg-yellow-50 border-yellow-200' },
  { nom: 'VVIP',     prix: '35000', couleur: 'bg-purple-50 border-purple-200' },
]

function uid() {
  return Math.random().toString(36).slice(2)
}

function formatFCFA(val: string) {
  const n = parseInt(val, 10)
  return isNaN(n) ? '—' : n.toLocaleString('fr-FR') + ' FCFA'
}

// ---------------------------------------------------------------------------
// Composant Étape Indicateur
// ---------------------------------------------------------------------------
function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current)
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const done    = i < idx
        const active  = i === idx
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              done   ? 'bg-green-100 text-green-700' :
              active ? 'bg-blue-600 text-white' :
                       'bg-gray-100 text-gray-400'
            }`}>
              <Icon size={13} />
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < idx ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function NewEventPage() {
  const router = useRouter()

  // --- État global du formulaire ---
  const [step, setStep]           = useState<Step>('infos')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // --- Étape 1 : Infos générales ---
  const [titre, setTitre]         = useState('')
  const [lieu, setLieu]           = useState('')
  const [date, setDate]           = useState('')
  const [heure, setHeure]         = useState('20:00')
  const [description, setDescription] = useState('')
  const [statut, setStatut]       = useState<'brouillon' | 'publie'>('brouillon')

  // --- Image ---
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUrl, setImageUrl]     = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Étape 2 : Billets ---
  const [tickets, setTickets] = useState<TicketTypeForm[]>([
    { id: uid(), nom: 'Standard', prix: '5000',  quantite_max: '200' },
  ])

  // ---------------------------------------------------------------------------
  // Gestion de l'image
  // ---------------------------------------------------------------------------
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl('')   // reset l'URL précédente
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  async function uploadImage(): Promise<string> {
    if (!imageFile) return imageUrl   // pas de nouveau fichier = URL déjà présente
    setImageUploading(true)
    try {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (!user) throw new Error('Non connecté.')

      const ext  = imageFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error } = await supabaseBrowser.storage
        .from('event-images')
        .upload(path, imageFile, { upsert: true })

      if (error) throw error

      const { data } = supabaseBrowser.storage
        .from('event-images')
        .getPublicUrl(path)

      return data.publicUrl
    } finally {
      setImageUploading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Gestion des tickets
  // ---------------------------------------------------------------------------
  function addTicket(preset?: typeof TICKET_PRESETS[0]) {
    setTickets((prev) => [
      ...prev,
      {
        id:           uid(),
        nom:          preset?.nom  ?? '',
        prix:         preset?.prix ?? '',
        quantite_max: '100',
      },
    ])
  }

  function removeTicket(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id))
  }

  function updateTicket(id: string, field: keyof Omit<TicketTypeForm, 'id'>, value: string) {
    setTickets((prev) =>
      prev.map((t) => t.id === id ? { ...t, [field]: value } : t)
    )
  }

  // ---------------------------------------------------------------------------
  // Validation par étape
  // ---------------------------------------------------------------------------
  function validateInfos(): string | null {
    if (!titre.trim())       return 'Le titre est obligatoire.'
    if (!lieu.trim())        return 'Le lieu est obligatoire.'
    if (!date)               return 'La date est obligatoire.'
    if (!description.trim()) return 'La description est obligatoire.'
    return null
  }

  function validateBillets(): string | null {
    if (tickets.length === 0) return 'Ajoutez au moins une catégorie de billet.'
    for (const t of tickets) {
      if (!t.nom.trim())           return `Nom manquant pour un billet.`
      if (!t.prix || parseInt(t.prix) < 0) return `Prix invalide pour "${t.nom}".`
      if (!t.quantite_max || parseInt(t.quantite_max) <= 0)
        return `Quantité invalide pour "${t.nom}".`
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Navigation entre étapes
  // ---------------------------------------------------------------------------
  function handleNext() {
    setSubmitError(null)
    if (step === 'infos') {
      const err = validateInfos()
      if (err) { setSubmitError(err); return }
      setStep('billets')
    } else if (step === 'billets') {
      const err = validateBillets()
      if (err) { setSubmitError(err); return }
      setStep('recap')
    }
  }

  function handleBack() {
    setSubmitError(null)
    if (step === 'billets') setStep('infos')
    else if (step === 'recap') setStep('billets')
    else router.push('/dashboard')
  }

  // ---------------------------------------------------------------------------
  // Soumission finale
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // 1. Upload de l'image si présente
      const finalImageUrl = await uploadImage()

      // 2. Construction de la date ISO
      const isoDate = new Date(`${date}T${heure}:00`).toISOString()

      // 3. Appel Server Action
      const res = await createEventAction({
        titre: titre.trim(),
        description: description.trim(),
        lieu: lieu.trim(),
        date: isoDate,
        image_url: finalImageUrl,
        statut: statut,
        capacite_totale: tickets.reduce((sum, t) => sum + parseInt(t.quantite_max || '0'), 0),
        ticket_types: tickets.map((t) => ({
          nom: t.nom.trim(),
          prix: parseInt(t.prix),
          quantite_max: parseInt(t.quantite_max),
        })),
      })

      if (res.error) throw new Error(res.error)

      // 4. Redirection vers le dashboard avec message de succès
      router.push(`/dashboard?created=${res.eventId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inattendue.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
  const capaciteTotale = tickets.reduce((sum, t) => sum + (parseInt(t.quantite_max) || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="bg-blue-600 hover:bg-blue-500 rounded-full p-2 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-blue-200 text-xs">Dashboard</p>
          <h1 className="font-bold text-lg leading-tight">Nouvel événement</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepBar current={step} />

        {/* ================================================================
            ÉTAPE 1 — Informations générales
        ================================================================ */}
        {step === 'infos' && (
          <div className="space-y-5">

            {/* Affiche / Image */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-600" />
                Affiche de l&apos;événement
              </h2>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                style={{ minHeight: '180px' }}
              >
                {imagePreview ? (
                  <div className="relative w-full h-48">
                    <Image src={imagePreview} alt="Aperçu" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <p className="text-white text-sm font-medium">Changer l&apos;image</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                    <Upload size={32} strokeWidth={1.5} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Glissez une image ici ou cliquez
                      </p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — max 5 Mo</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]) }}
              />
            </div>

            {/* Infos générales */}
            <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Informations générales
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre de l&apos;événement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex : Soirée Gala de la Paix — Bangui 2025"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin size={13} className="inline mr-1 text-blue-500" />
                  Lieu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder="Ex : Palais des Congrès de Bangui, RCA"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={13} className="inline mr-1 text-blue-500" />
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure
                  </label>
                  <input
                    type="time"
                    value={heure}
                    onChange={(e) => setHeure(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Décrivez votre événement : programme, artistes, ambiance…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut de publication
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['brouillon', 'publie'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatut(s)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                        statut === s
                          ? s === 'publie'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {s === 'brouillon' ? '📝 Brouillon' : '🚀 Publier maintenant'}
                    </button>
                  ))}
                </div>
                {statut === 'brouillon' && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Enregistré mais invisible pour les acheteurs.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            ÉTAPE 2 — Catégories de billets
        ================================================================ */}
        {step === 'billets' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Ticket size={18} className="text-blue-600" />
                Catégories de billets
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                Définissez le nom, le prix et le stock de chaque catégorie.
              </p>

              {/* Presets rapides */}
              <div className="flex gap-2 mb-5 flex-wrap">
                <span className="text-xs text-gray-500 self-center">Ajouter :</span>
                {TICKET_PRESETS.map((p) => (
                  <button
                    key={p.nom}
                    type="button"
                    onClick={() => addTicket(p)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    + {p.nom}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addTicket()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition"
                >
                  + Personnalisé
                </button>
              </div>

              {/* Liste des tickets */}
              <div className="space-y-3">
                {tickets.map((ticket, idx) => (
                  <div
                    key={ticket.id}
                    className="border border-gray-100 rounded-2xl p-4 bg-gray-50 relative"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Catégorie {idx + 1}
                      </span>
                      {tickets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicket(ticket.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Nom</label>
                        <input
                          type="text"
                          value={ticket.nom}
                          onChange={(e) => updateTicket(ticket.id, 'nom', e.target.value)}
                          placeholder="Standard"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Prix (FCFA)</label>
                        <input
                          type="number"
                          min="0"
                          value={ticket.prix}
                          onChange={(e) => updateTicket(ticket.id, 'prix', e.target.value)}
                          placeholder="5000"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Stock</label>
                        <input
                          type="number"
                          min="1"
                          value={ticket.quantite_max}
                          onChange={(e) => updateTicket(ticket.id, 'quantite_max', e.target.value)}
                          placeholder="200"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white transition"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 bg-blue-50 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-blue-700 font-medium">Capacité totale</span>
                <span className="text-lg font-bold text-blue-900">
                  {capaciteTotale.toLocaleString('fr-FR')} places
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            ÉTAPE 3 — Récapitulatif
        ================================================================ */}
        {step === 'recap' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              {/* Image aperçu */}
              {imagePreview && (
                <div className="relative w-full h-44">
                  <Image src={imagePreview} alt={titre} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      statut === 'publie'
                        ? 'bg-green-400 text-green-900'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {statut === 'publie' ? '🚀 Publié' : '📝 Brouillon'}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-3">
                <h2 className="text-xl font-bold text-gray-900">{titre}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MapPin size={13} className="text-blue-500" /> {lieu}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-500" />
                  {date && heure
                    ? new Date(`${date}T${heure}`).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                        year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            </div>

            {/* Résumé des billets */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Ticket size={16} className="text-blue-600" />
                Billets ({tickets.length} catégorie{tickets.length > 1 ? 's' : ''})
              </h3>
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{t.nom}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {parseInt(t.quantite_max).toLocaleString('fr-FR')} places
                      </span>
                    </div>
                    <span className="font-bold text-blue-700 text-sm">{formatFCFA(t.prix)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                <span className="text-sm text-gray-500">Capacité totale</span>
                <span className="font-bold text-gray-900">
                  {capaciteTotale.toLocaleString('fr-FR')} places
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            Erreur
        ================================================================ */}
        {submitError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* ================================================================
            Boutons de navigation
        ================================================================ */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
          >
            {step === 'infos' ? 'Annuler' : '← Retour'}
          </button>

          {step !== 'recap' ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-2 flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || imageUploading}
              className="flex-1 py-3.5 rounded-2xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting || imageUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {imageUploading ? 'Upload image…' : 'Création…'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {statut === 'publie' ? 'Publier l\'événement' : 'Enregistrer en brouillon'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
