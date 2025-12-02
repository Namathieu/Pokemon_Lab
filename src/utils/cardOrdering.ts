import type { DeckEntry, PokemonCard } from '@/types/pokemon'

const POKEMON_LABEL = 'Pokémon'

const SUPER_TYPE_ORDER: Record<string, number> = {
  [POKEMON_LABEL]: 0,
  Trainer: 1,
  Energy: 2,
}

const STAGE_PRIORITY: Record<string, number> = {
  Basic: 0,
  'Stage 1': 1,
  'Stage 2': 2,
  'Stage 3': 3,
  Restored: 1,
  BREAK: 2,
}

const TRAINER_SUBTYPE_ORDER: Record<string, number> = {
  Supporter: 0,
  Item: 1,
  Tool: 1,
  Stadium: 2,
}

const ENERGY_SUBTYPE_ORDER: Record<string, number> = {
  Basic: 0,
  Special: 1,
}

export function buildPokemonNameIndex(cards: PokemonCard[]) {
  const map = new Map<string, PokemonCard>()
  cards.forEach((card) => {
    if (card.supertype === POKEMON_LABEL && !map.has(card.name)) {
      map.set(card.name, card)
    }
  })
  return map
}

function getStageRank(card: PokemonCard) {
  const subtypes = card.subtypes ?? []
  const ranks = subtypes.map((subtype) => STAGE_PRIORITY[subtype] ?? Number.POSITIVE_INFINITY)
  const best = Math.min(...ranks)
  return Number.isFinite(best) ? best : 0
}

function getTrainerRank(card: PokemonCard) {
  const subtypes = card.subtypes ?? []
  const ranks = subtypes.map((subtype) => TRAINER_SUBTYPE_ORDER[subtype] ?? Number.POSITIVE_INFINITY)
  const best = Math.min(...ranks)
  return Number.isFinite(best) ? best : TRAINER_SUBTYPE_ORDER.Stadium + 1
}

function getEnergyRank(card: PokemonCard) {
  const subtypes = card.subtypes ?? []
  const ranks = subtypes.map((subtype) => ENERGY_SUBTYPE_ORDER[subtype] ?? Number.POSITIVE_INFINITY)
  const best = Math.min(...ranks)
  return Number.isFinite(best) ? best : ENERGY_SUBTYPE_ORDER.Special + 1
}

function resolveEvolutionRoot(card: PokemonCard, nameIndex: Map<string, PokemonCard>) {
  if (card.supertype !== POKEMON_LABEL) return card.name.toLowerCase()
  const visited = new Set<string>()
  let current: PokemonCard | undefined = card
  let fallback = card.evolvesFrom?.toLowerCase()

  while (current && current.evolvesFrom && !visited.has(current.name)) {
    visited.add(current.name)
    const parentName = current.evolvesFrom
    fallback = parentName.toLowerCase()
    const parentCard = nameIndex.get(parentName)
    if (!parentCard) break
    current = parentCard
  }

  return (current?.name ?? fallback ?? card.name).toLowerCase()
}

export function compareCardsForDisplay(
  a: PokemonCard,
  b: PokemonCard,
  nameIndex: Map<string, PokemonCard>,
) {
  const orderA = SUPER_TYPE_ORDER[a.supertype] ?? 3
  const orderB = SUPER_TYPE_ORDER[b.supertype] ?? 3
  if (orderA !== orderB) return orderA - orderB

  if (a.supertype === POKEMON_LABEL && b.supertype === POKEMON_LABEL) {
    const rootA = resolveEvolutionRoot(a, nameIndex)
    const rootB = resolveEvolutionRoot(b, nameIndex)
    if (rootA !== rootB) return rootA.localeCompare(rootB)

    const stageA = getStageRank(a)
    const stageB = getStageRank(b)
    if (stageA !== stageB) return stageA - stageB
    return a.name.localeCompare(b.name)
  }

  if (a.supertype === 'Trainer' && b.supertype === 'Trainer') {
    const trainerRankDiff = getTrainerRank(a) - getTrainerRank(b)
    if (trainerRankDiff !== 0) return trainerRankDiff
    return a.name.localeCompare(b.name)
  }

  if (a.supertype === 'Energy' && b.supertype === 'Energy') {
    const energyRankDiff = getEnergyRank(a) - getEnergyRank(b)
    if (energyRankDiff !== 0) return energyRankDiff
    return a.name.localeCompare(b.name)
  }

  return a.name.localeCompare(b.name)
}

export function compareDeckEntries(
  a: DeckEntry,
  b: DeckEntry,
  nameIndex: Map<string, PokemonCard>,
) {
  return compareCardsForDisplay(a.card, b.card, nameIndex)
}
