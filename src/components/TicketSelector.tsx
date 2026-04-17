'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

export interface TicketType {
  id: string
  nom: string
  prix: number
  quantite_max: number
  quantite_vendue: number
}

interface TicketSelectorProps {
  ticket: TicketType
  quantity: number
  selected: boolean
  onSelect: (id: string) => void
  onQuantityChange: (id: string, quantity: number) => void
}

const BADGE_COLORS: Record<string, string> = {
  Standard: 'bg-blue-100 text-blue-800',
  VIP: 'bg-yellow-100 text-yellow-800',
  VVIP: 'bg-purple-100 text-purple-800',
}

export default function TicketSelector({
  ticket,
  quantity,
  selected,
  onSelect,
  onQuantityChange,
}: TicketSelectorProps) {
  const remaining = ticket.quantite_max - ticket.quantite_vendue
  const isSoldOut = remaining <= 0

  return (
    <div
      onClick={() => !isSoldOut && onSelect(ticket.id)}
      className={`rounded-2xl border-2 p-4 transition-all cursor-pointer ${
        isSoldOut
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : selected
          ? 'border-blue-600 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              BADGE_COLORS[ticket.nom] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {ticket.nom}
          </span>
          {isSoldOut && (
            <span className="text-xs text-red-500 font-medium">Complet</span>
          )}
          {!isSoldOut && remaining <= 10 && (
            <span className="text-xs text-orange-500 font-medium">
              {remaining} restant{remaining > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-lg font-bold text-gray-900">
          {ticket.prix.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">FCFA</span>
        </span>
      </div>

      {selected && !isSoldOut && (
        <div
          className="mt-4 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-gray-600">Quantité</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onQuantityChange(ticket.id, Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
              disabled={quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold text-gray-900">{quantity}</span>
            <button
              onClick={() => onQuantityChange(ticket.id, Math.min(10, remaining, quantity + 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
              disabled={quantity >= Math.min(10, remaining)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
