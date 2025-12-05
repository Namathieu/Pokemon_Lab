import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { FilterPanel } from '@/components/filter/FilterPanel'
import { CardGrid } from '@/components/cards/CardGrid'
import { DeckPanel, DECK_DROPPABLE_ID } from '@/components/deck/DeckPanel'
import { CardDetailModal } from '@/components/cards/CardDetailModal'
import type { CardLibraryPayload, CardSearchFilters, PokemonCard } from '@/types/pokemon'
import { useDeckStore } from '@/state/useDeckStore'
import { useLocalCardSearch, LOCAL_PAGE_SIZE } from '@/hooks/useLocalCardSearch'
import { DeckLibraryPage } from '@/pages/DeckLibraryPage'
import { EventManagerPage } from '@/pages/EventManagerPage'
import { DeckViewerPage } from '@/pages/DeckViewerPage'
import { CardSearchPage } from '@/pages/CardSearchPage'
import { getLocalCardImage, imageErrorHandler } from '@/utils/cardImages'

const DEFAULT_FILTERS: CardSearchFilters = {
  search: '',
  supertype: 'Pokémon',
  types: [],
  setId: '',
  standardOnly: true,
  regulationMarks: [],
  stages: [],
  sort: 'name-asc',
}

function DragPreview({ card }: { card: PokemonCard }) {
  return (
    <div className='rounded-2xl border border-emerald-400/70 bg-slate-900/80 p-3 shadow-2xl shadow-emerald-500/30'>
      <img
        src={getLocalCardImage(card)}
        onError={imageErrorHandler(card)}
        alt={card.name}
        className='h-44 w-auto rounded-xl border border-white/10'
      />
      <p className='mt-2 text-center text-sm font-semibold text-white'>{card.name}</p>
    </div>
  )
}

async function fetchLocalLibrary(): Promise<CardLibraryPayload> {
  const response = await fetch(`/data/standard-cards.json?cache-bust=${Date.now()}`)
  if (!response.ok) {
    throw new Error('Local card bundle not found. Run "npm run sync:cards" to generate it.')
  }
  return response.json() as Promise<CardLibraryPayload>
}

function App() {
  const [filters, setFilters] = useState<CardSearchFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [activeCard, setActiveCard] = useState<PokemonCard | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null)
  const [activeView, setActiveView] = useState<'builder' | 'library' | 'events' | 'viewer' | 'search'>('builder')

  const addCard = useDeckStore((state) => state.addCard)
  const deckCards = useDeckStore((state) => state.cards)

  const {
    data: library,
    isLoading: libraryLoading,
    isFetching: libraryFetching,
    refetch: reloadLibrary,
    error: libraryError,
  } = useQuery({
    queryKey: ['card-library'],
    queryFn: fetchLocalLibrary,
    staleTime: Infinity,
    retry: false,
  })

  const deckCounts = useMemo(() => {
    const map: Record<string, number> = {}
    Object.values(deckCards).forEach((entry) => {
      map[entry.card.id] = entry.count
    })
    return map
  }, [deckCards])

  const libraryCards = library?.cards ?? []
  const localSearch = useLocalCardSearch(filters, page, libraryCards, libraryCards.length > 0)
  const availableSets = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    libraryCards.forEach((card) => {
      if (card.set?.id && card.set?.name && !map.has(card.set.id)) {
        map.set(card.set.id, { id: card.set.id, name: card.set.name })
      }
    })
    return Array.from(map.values())
  }, [libraryCards])

  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    libraryCards.forEach((card) => {
      card.types?.forEach((type) => set.add(type))
    })
    return Array.from(set).sort()
  }, [libraryCards])

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current as PokemonCard | undefined
    if (card) {
      setActiveCard(card)
      setDraggingCardId(card.id)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const card = event.active?.data.current as PokemonCard | undefined
    if (card && event.over?.id === DECK_DROPPABLE_ID) {
      addCard(card)
    }
    setActiveCard(null)
    setDraggingCardId(null)
  }

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  const handleFiltersChange = (next: CardSearchFilters) => {
    setFilters(next)
    setPage(1)
  }

  const effectiveCards = localSearch.cards
  const effectiveTotal = localSearch.totalCount
  const effectiveLoading = libraryLoading || localSearch.isLoading

  const emptyState = libraryError
    ? {
        title: 'Card bundle missing',
        body: 'Run "npm run sync:cards" to rebuild the local library, then reload the bundle.',
      }
    : libraryCards.length === 0
      ? {
          title: 'No cards loaded',
          body: 'Run "npm run sync:cards" to generate the offline bundle.',
        }
      : undefined

  return (
    <div className='min-h-screen pb-8 text-white'>
      <div className='mx-auto flex max-w-[1800px] flex-col gap-6 p-6'>
        <header className='rounded-3xl border border-white/10 bg-slate-950/70 px-6 py-8 shadow-2xl shadow-black/60'>
          <p className='text-xs uppercase tracking-[0.5em] text-emerald-300'>Pokédex Labs</p>
          <div className='mt-3 flex flex-wrap items-end justify-between gap-4'>
            <div>
              <h1 className='text-4xl font-extrabold tracking-tight text-white md:text-5xl'>
                Standard Deck Architect
              </h1>
              <p className='mt-2 max-w-2xl text-base text-slate-300'>
                Explore every Standard-legal Pokémon card, drag them into your deck, and validate your list in real
                time. Built for speed and competitive playtesting.
              </p>
            </div>
            <div className='flex flex-col gap-3'>
              <div className='rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100'>
                Card data sourced from <span className='font-semibold'>pokemon-tcg-data</span>. Run{' '}
                <code>npm run sync:cards</code> after updating the dataset folder.
              </div>
              <div className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm text-slate-100'>
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    activeView === 'builder'
                      ? 'bg-emerald-500 text-emerald-950 font-semibold'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setActiveView('builder')}
                >
                  Deck Builder
                </button>
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    activeView === 'library'
                      ? 'bg-emerald-500 text-emerald-950 font-semibold'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setActiveView('library')}
                >
                  Deck Library
                </button>
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    activeView === 'search'
                      ? 'bg-emerald-500 text-emerald-950 font-semibold'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setActiveView('search')}
                >
                  Card Search
                </button>
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    activeView === 'viewer'
                      ? 'bg-emerald-500 text-emerald-950 font-semibold'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setActiveView('viewer')}
                >
                  Deck Viewer
                </button>
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    activeView === 'events'
                      ? 'bg-emerald-500 text-emerald-950 font-semibold'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setActiveView('events')}
                >
                  Event Manager
                </button>
              </div>
            </div>
          </div>
        </header>

        {activeView === 'builder' ? (
          <>
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveCard(null)}>
              <div className='grid gap-6 xl:grid-cols-[320px_1fr_360px]'>
                <FilterPanel
                  filters={filters}
                  onChange={handleFiltersChange}
                  onReset={resetFilters}
                  sets={availableSets}
                  types={availableTypes}
                  libraryStatus={{
                    count: libraryCards.length,
                    generatedAt: library?.generatedAt,
                    isLoading: libraryLoading || libraryFetching,
                  }}
                  onReloadLibrary={() => reloadLibrary()}
                />
                <CardGrid
                  cards={effectiveCards}
                  isLoading={effectiveLoading}
                  totalCount={effectiveTotal}
                  page={page}
                  pageSize={LOCAL_PAGE_SIZE}
                  onPageChange={(next) => setPage(next)}
                  onAdd={addCard}
                  deckCounts={deckCounts}
                  emptyState={emptyState}
                  onSelect={(card) => setPreviewCard(card)}
                  draggingCardId={draggingCardId}
                />
                <DeckPanel cardLibrary={libraryCards} libraryLoaded={libraryCards.length > 0} />
              </div>

              <DragOverlay dropAnimation={null}>
                {activeCard ? <DragPreview card={activeCard} /> : null}
              </DragOverlay>
            </DndContext>
            {previewCard ? <CardDetailModal card={previewCard} onClose={() => setPreviewCard(null)} /> : null}
          </>
        ) : (
          activeView === 'library' ? (
            <DeckLibraryPage
              cardLibrary={libraryCards}
              libraryLoaded={libraryCards.length > 0}
              onGoToEvents={() => setActiveView('events')}
            />
          ) : activeView === 'search' ? (
            <CardSearchPage
              cardLibrary={libraryCards}
              libraryLoaded={libraryCards.length > 0}
              onReloadLibrary={() => reloadLibrary()}
            />
          ) : activeView === 'viewer' ? (
            <DeckViewerPage />
          ) : (
            <EventManagerPage />
          )
        )}
      </div>
    </div>
  )
}

export default App
