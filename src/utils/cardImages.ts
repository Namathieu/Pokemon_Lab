import type { SyntheticEvent } from 'react'
import type { PokemonCard } from '@/types/pokemon'

export function getLocalCardImage(card: PokemonCard, size: 'small' | 'large' = 'small') {
  return `/cards/${size}/${card.id}.jpg`
}

export function imageErrorHandler(card: PokemonCard, size: 'small' | 'large' = 'small') {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget
    // prevent loops
    if ((target as HTMLImageElement & { dataset: Record<string, string> }).dataset.fallbackApplied === 'true') {
      return
    }
    const fallback = size === 'large' ? card.images.large ?? card.images.small : card.images.small
    if (!fallback) return
    ;(target as HTMLImageElement & { dataset: Record<string, string> }).dataset.fallbackApplied = 'true'
    target.src = fallback
  }
}
