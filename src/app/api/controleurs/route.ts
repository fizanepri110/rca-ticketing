import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerProfile } from '@/lib/auth'

// POST /api/controleurs — Ajouter un contrôleur
export async function POST(req: NextRequest) {
  const profile = await getServerProfile()

  if (!profile || profile.role !== 'organisateur') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { telephone, nom } = await req.json()

  if (!telephone || !nom) {
    return NextResponse.json({ error: 'Téléphone et nom obligatoires.' }, { status: 400 })
  }

  // Vérifie si ce numéro est déjà contrôleur pour cet organisateur
  const { data: existing } = await supabaseAdmin
    .from('controleurs')
    .select('id')
    .eq('organisateur_id', profile.id)
    .eq('telephone', telephone)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Ce numéro est déjà enregistré.' }, { status: 409 })
  }

  const { data: controleur, error } = await supabaseAdmin
    .from('controleurs')
    .insert({ organisateur_id: profile.id, telephone, nom })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de l\'ajout.' }, { status: 500 })
  }

  return NextResponse.json({ controleur }, { status: 201 })
}

// DELETE /api/controleurs?id=xxx — Révoquer un contrôleur
export async function DELETE(req: NextRequest) {
  const profile = await getServerProfile()

  if (!profile || profile.role !== 'organisateur') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'ID manquant.' }, { status: 400 })
  }

  // S'assure que le contrôleur appartient bien à cet organisateur
  const { error } = await supabaseAdmin
    .from('controleurs')
    .delete()
    .eq('id', id)
    .eq('organisateur_id', profile.id)

  if (error) {
    return NextResponse.json({ error: 'Suppression impossible.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
