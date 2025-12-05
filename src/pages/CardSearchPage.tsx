import { useMemo, useState } from 'react'
import type { CardSearchFilters, PokemonCard } from '@/types/pokemon'
import { FilterPanel } from '@/components/filter/FilterPanel'
import { CardGrid } from '@/components/cards/CardGrid'
import { useLocalCardSearch, LOCAL_PAGE_SIZE } from '@/hooks/useLocalCardSearch'

const DEFAULT_FILTERS: CardSearchFilters = {
  search: '',
  supertype: 'PokAcmon',
  types: [],
  setId: '',
  standardOnly: true,
  regulationMarks: [],
  stages: [],
  sort: 'name-asc',
}

interface CardSearchPageProps {
  cardLibrary: PokemonCard[]
  libraryLoaded: boolean
  onReloadLibrary(): void
}

function filterAll(cards: PokemonCard[], filters: CardSearchFilters) {
  // Reuse the hook but without pagination by filtering locally
  // Matches logic mirrors useLocalCardSearch
  return cards.filter((card) => {
    if (filters.standardOnly && (card.legalities?.standard ?? '').toLowerCase() !== 'legal') return false
    if (filters.regulationMarks.length) {
      const mark = card.regulationMark?.toUpperCase() ?? ''
      if (!mark || !filters.regulationMarks.includes(mark)) return false
    }
    if (filters.supertype && card.supertype !== filters.supertype) return false
    if (filters.types.length) {
      const cardTypes = card.types ?? []
      if (!cardTypes.some((type) => filters.types.includes(type))) return false
    }
    if (filters.stages.length) {
      const subtypes = card.subtypes ?? []
      if (!subtypes.some((subtype) => filters.stages.includes(subtype))) return false
    }
    if (filters.setId && card.set?.id !== filters.setId) return false
    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase()
      if (!card.name.toLowerCase().includes(query)) return false
    }
    return true
  })
}

export function CardSearchPage({ cardLibrary, libraryLoaded, onReloadLibrary }: CardSearchPageProps) {
  const [filters, setFilters] = useState<CardSearchFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)

  const availableSets = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    cardLibrary.forEach((card) => {
      if (card.set?.id && card.set?.name && !map.has(card.set.id)) {
        map.set(card.set.id, { id: card.set.id, name: card.set.name })
      }
    })
    return Array.from(map.values())
  }, [cardLibrary])

  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    cardLibrary.forEach((card) => {
      card.types?.forEach((type) => set.add(type))
    })
    return Array.from(set).sort()
  }, [cardLibrary])

  const searchResult = useLocalCardSearch(filters, page, cardLibrary, libraryLoaded)

  const handleExport = () => {
    const filtered = filterAll(cardLibrary, filters)
    if (!filtered.length) return
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `card-search-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  return (
    <div className='space-y-4'>
      <FilterPanel
        filters={filters}
        onChange={(next) => {
          setFilters(next)
          setPage(1)
        }}
        onReset={resetFilters}
        sets={availableSets}
        types={availableTypes}
        libraryStatus={{
          count: cardLibrary.length,
          generatedAt: undefined,
          isLoading: !libraryLoaded,
        }}
        onReloadLibrary={onReloadLibrary}
      />

      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/60'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-xs uppercase tracking-[0.3em] text-slate-500'>Card Search</p>
            <h3 className='text-2xl font-semibold text-white'>Browse and export filtered cards</h3>
            <p className='text-sm text-slate-300'>Current results: {searchResult.totalCount.toLocaleString()}</p>
          </div>
          <button
            className='rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400'
            onClick={handleExport}
            disabled={!searchResult.totalCount}
          >
            Export filtered JSON
          </button>
        </div>

        <div className='mt-4'>
          <CardGrid
            cards={searchResult.cards}
            isLoading={searchResult.isLoading}
            totalCount={searchResult.totalCount}
            page={page}
            pageSize={LOCAL_PAGE_SIZE}
            onPageChange={(next) => setPage(next)}
            onAdd={undefined}
            deckCounts={{}}
            emptyState={{
              title: 'No cards found',
              body: 'Try adjusting your filters.',
            }}
            onSelect={undefined}
            draggingCardId={null}
          />
        </div>
      </div>
    </div>
  )
}
