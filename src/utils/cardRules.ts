import type { PokemonCard } from '@/types/pokemon'

const STANDARD_REGULATION_MARKS = new Set(['G', 'H', 'I'])

export function isStandardCard(card: PokemonCard) {
  const mark = card.regulationMark?.toUpperCase()
  if (mark) {
    return STANDARD_REGULATION_MARKS.has(mark)
  }
  return card.legalities?.standard?.toLowerCase() === 'legal'
}
