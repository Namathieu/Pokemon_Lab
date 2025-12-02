import type { DeckEntry } from '@/types/pokemon'
import { isStandardCard } from './cardRules'

const SUPER_TYPES = ['Pokémon', 'Trainer', 'Energy']

const MAX_DECK_SIZE = 60

function getSetIdentifier(entry: DeckEntry) {
  return entry.card.set?.ptcgoCode ?? entry.card.set?.id ?? 'UNK'
}

export function formatDeckAsText(deckName: string, entries: DeckEntry[]) {
  const lines: string[] = []
  lines.push('****** Pokémon TCG Deck List ******')
  lines.push(`Deck: ${deckName}`)
  lines.push('')

  SUPER_TYPES.forEach((group) => {
    const grouped = entries.filter((entry) => entry.card.supertype === group)
    if (!grouped.length) return
    const total = grouped.reduce((sum, entry) => sum + entry.count, 0)
    lines.push(`##${group} - ${total}`)
    grouped.forEach((entry) => {
      lines.push(`${entry.count} ${entry.card.name} ${getSetIdentifier(entry)} ${entry.card.number}`)
    })
    lines.push('')
  })

  const other = entries.filter((entry) => !SUPER_TYPES.includes(entry.card.supertype))
  if (other.length) {
    const total = other.reduce((sum, entry) => sum + entry.count, 0)
    lines.push(`##Other - ${total}`)
    other.forEach((entry) => {
      lines.push(`${entry.count} ${entry.card.name} ${getSetIdentifier(entry)} ${entry.card.number}`)
    })
  }

  lines.push('')
  lines.push(`Total Cards: ${entries.reduce((sum, entry) => sum + entry.count, 0)}/${MAX_DECK_SIZE}`)
  return lines.join('\n')
}

export interface DeckStats {
  total: number
  remaining: number
  countsBySupertype: Record<string, number>
  standardLegal: boolean
}

export function computeDeckStats(entries: DeckEntry[]): DeckStats {
  const countsBySupertype: Record<string, number> = {}
  let total = 0
  let standardLegal = true

  entries.forEach((entry) => {
    const key = entry.card.supertype ?? 'Other'
    countsBySupertype[key] = (countsBySupertype[key] ?? 0) + entry.count
    total += entry.count
    if (standardLegal && !isStandardCard(entry.card)) {
      standardLegal = false
    }
  })

  return {
    total,
    remaining: Math.max(0, MAX_DECK_SIZE - total),
    countsBySupertype,
    standardLegal,
  }
}
