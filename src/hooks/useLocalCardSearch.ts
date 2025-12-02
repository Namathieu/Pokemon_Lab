import { useMemo } from 'react'
import type { CardSearchFilters, PokemonCard } from '@/types/pokemon'
import { isStandardCard } from '@/utils/cardRules'
import { buildPokemonNameIndex, compareCardsForDisplay } from '@/utils/cardOrdering'

export const LOCAL_PAGE_SIZE = 24

function matchesFilters(card: PokemonCard, filters: CardSearchFilters) {
  if (filters.standardOnly && !isStandardCard(card)) {
    return false
  }

  if (filters.regulationMarks.length) {
    const mark = card.regulationMark?.toUpperCase() ?? ''
    if (!mark || !filters.regulationMarks.includes(mark)) {
      return false
    }
  }

  if (filters.supertype && card.supertype !== filters.supertype) {
    return false
  }

  if (filters.types.length) {
    const cardTypes = card.types ?? []
    if (!cardTypes.some((type) => filters.types.includes(type))) {
      return false
    }
  }

  if (filters.stages.length) {
    const subtypes = card.subtypes ?? []
    if (!subtypes.some((subtype) => filters.stages.includes(subtype))) {
      return false
    }
  }

  if (filters.setId && card.set?.id !== filters.setId) {
    return false
  }

  if (filters.search.trim()) {
    const query = filters.search.trim().toLowerCase()
    return card.name.toLowerCase().includes(query)
  }

  return true
}

function sortCards(
  cards: PokemonCard[],
  sort: CardSearchFilters['sort'],
  nameIndex: Map<string, PokemonCard>,
) {
  return [...cards].sort((a, b) => {
    if (sort === 'name-asc') {
      return compareCardsForDisplay(a, b, nameIndex)
    }
    const dateA = a.set?.releaseDate ?? ''
    const dateB = b.set?.releaseDate ?? ''
    return dateA < dateB ? 1 : dateA > dateB ? -1 : 0
  })
}

export function useLocalCardSearch(
  filters: CardSearchFilters,
  page: number,
  cards: PokemonCard[],
  isCacheReady: boolean,
) {
  const pokemonNameIndex = useMemo(() => buildPokemonNameIndex(cards), [cards])

  return useMemo(() => {
    if (!isCacheReady) {
      return {
        isLoading: true,
        cards: [] as PokemonCard[],
        totalCount: 0,
      }
    }

    const filtered = cards.filter((card) => matchesFilters(card, filters))
    const ordered = sortCards(filtered, filters.sort, pokemonNameIndex)
    const start = (page - 1) * LOCAL_PAGE_SIZE
    const end = start + LOCAL_PAGE_SIZE

    return {
      isLoading: false,
      cards: ordered.slice(start, end),
      totalCount: ordered.length,
    }
  }, [cards, filters, isCacheReady, page, pokemonNameIndex])
}
