export interface PokemonCard {
  id: string
  name: string
  supertype: string
  subtypes?: string[]
  types?: string[]
  hp?: string
  number: string
  rarity?: string
  flavorText?: string
  regulationMark?: string
  set: PokemonSet
  images: {
    small: string
    large: string
  }
  legalities: {
    standard?: string
    [key: string]: string | undefined
  }
}

export interface PokemonSet {
  id: string
  name: string
  series: string
  ptcgoCode?: string
  releaseDate: string
  images?: {
    symbol: string
    logo: string
  }
  legalities?: {
    standard?: string
  }
}

export interface CardSearchFilters {
  search: string
  supertype: string
  types: string[]
  setId: string
  standardOnly: boolean
  regulationMarks: string[]
  stages: string[]
  sort: 'name-asc' | 'release-desc'
}

export interface CardSearchResult {
  data: PokemonCard[]
  page: number
  pageSize: number
  count: number
  totalCount: number
}

export interface DeckEntry {
  card: PokemonCard
  count: number
}

export interface CardLibraryPayload {
  generatedAt: string
  count: number
  cards: PokemonCard[]
}
