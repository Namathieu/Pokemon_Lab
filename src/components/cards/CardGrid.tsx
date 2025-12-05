import { useMemo, type PointerEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { PokemonCard } from '@/types/pokemon'
import { Plus, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { getLocalCardImage, imageErrorHandler } from '@/utils/cardImages'

interface CardGridProps {
  cards: PokemonCard[]
  isLoading: boolean
  totalCount: number
  page: number
  pageSize: number
  onPageChange(page: number): void
  onAdd?: (card: PokemonCard) => void
  deckCounts?: Record<string, number>
  emptyState?: {
    title: string
    body: string
  }
  onSelect?(card: PokemonCard): void
  draggingCardId?: string | null
}

function formatTypes(card: PokemonCard) {
  return card.types?.join(' · ') ?? 'Colorless'
}

function CardTile({
  card,
  countInDeck,
  onAdd,
  onSelect,
  disableClick,
}: {
  card: PokemonCard
  countInDeck: number
  onAdd?(card: PokemonCard): void
  onSelect?(card: PokemonCard): void
  disableClick?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
  })
  const handleButtonPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    // Prevent the drag activator from triggering when interacting with buttons
    event.stopPropagation()
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg shadow-black/40 transition hover:-translate-y-1 hover:border-emerald-400/80',
        isDragging && 'z-10 border-emerald-400 bg-slate-900/90 shadow-emerald-500/20',
      )}
      onClick={() => {
        if (!isDragging && !disableClick) {
          onSelect?.(card)
        }
      }}
    >
      <div
        className='relative flex items-center justify-center bg-slate-900/70 p-4'
        {...attributes}
        {...listeners}
      >
        <img
          src={getLocalCardImage(card)}
          onError={imageErrorHandler(card)}
          alt={card.name}
          className='h-44 w-auto rounded-lg border border-white/5 shadow-inner shadow-black/60'
          draggable={false}
        />
        <button
          className='absolute bottom-3 left-3 inline-flex items-center justify-center rounded-full border border-slate-500/60 px-3 py-1 text-xs font-semibold text-slate-200 shadow-lg shadow-black/40 transition hover:border-emerald-300 hover:text-emerald-200'
          onClick={(event) => {
            event.stopPropagation()
            onSelect?.(card)
          }}
          onPointerDown={handleButtonPointerDown}
        >
          Details
        </button>
        {onAdd ? (
          <button
            className='absolute bottom-3 right-3 inline-flex items-center justify-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400'
            onClick={(event) => {
              event.stopPropagation()
              onAdd(card)
            }}
            onPointerDown={handleButtonPointerDown}
          >
            <Plus size={14} />
            <span className='ml-1'>Add</span>
          </button>
        ) : null}
        {onAdd && countInDeck > 0 && (
          <div className='absolute left-3 top-3 rounded-full border border-emerald-300/60 bg-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-50'>
            In deck: {countInDeck}
          </div>
        )}
      </div>
      <div className='flex flex-1 flex-col px-4 py-3'>
        <div className='flex items-center justify-between text-xs uppercase tracking-wide text-slate-400'>
          <span>{card.set?.name}</span>
          <span>#{card.number}</span>
        </div>
        <h3 className='mt-1 text-lg font-semibold text-white'>{card.name}</h3>
        <p className='text-sm text-slate-300'>{formatTypes(card)}</p>
        <div className='mt-auto flex items-center justify-between text-xs text-slate-400'>
          <span>{card.rarity ?? 'Common'}</span>
          <span className='inline-flex items-center gap-1 text-emerald-300'>
            <Sparkles size={12} />
            {card.legalities?.standard?.toLowerCase() === 'legal' ? 'Standard' : 'Expanded'}
          </span>
        </div>
      </div>
    </div>
  )
}

function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number
  total: number
  pageSize: number
  onPageChange(page: number): void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasResults = total > 0
  const from = hasResults ? (page - 1) * pageSize + 1 : 0
  const to = hasResults ? Math.min(total, page * pageSize) : 0

  return (
    <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300'>
      <span>
        Showing {from}-{to} of {total.toLocaleString()} cards
      </span>
      <div className='flex items-center gap-2'>
        <button
          className='rounded-full border border-slate-600/60 px-3 py-1 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500'
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || !hasResults}
        >
          Previous
        </button>
        <span className='text-xs font-semibold text-slate-400'>
          Page {page} / {totalPages}
        </span>
        <button
          className='rounded-full border border-slate-600/60 px-3 py-1 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500'
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || !hasResults}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className='animate-pulse rounded-2xl border border-white/5 bg-slate-900/30 p-4'>
      <div className='h-48 rounded-xl bg-slate-700/30' />
      <div className='mt-4 h-4 rounded-full bg-slate-700/30' />
      <div className='mt-2 h-4 w-1/2 rounded-full bg-slate-700/20' />
      <div className='mt-6 h-4 w-1/3 rounded-full bg-slate-700/10' />
    </div>
  )
}

export function CardGrid({
  cards,
  isLoading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onAdd,
  deckCounts,
  emptyState,
  onSelect,
  draggingCardId,
}: CardGridProps) {
  const renderCards = useMemo(() => cards, [cards])

  return (
    <section className='flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-black/50'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs uppercase tracking-[0.3em] text-slate-500'>Card Pool</p>
          <h2 className='text-2xl font-semibold text-white'>Card Library</h2>
        </div>
      </div>

      <div className='mt-4 flex-1 overflow-y-auto pr-1'>
        {isLoading ? (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : renderCards.length ? (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {renderCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                countInDeck={deckCounts?.[card.id] ?? 0}
                onAdd={onAdd}
                onSelect={onSelect}
                disableClick={draggingCardId === card.id}
              />
            ))}
          </div>
        ) : (
          <div className='flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center text-slate-400'>
            <p className='text-lg font-semibold text-white'>{emptyState?.title ?? 'No cards found'}</p>
            <p className='text-sm text-slate-400'>
              {emptyState?.body ?? 'Try refining your filters or search query.'}
            </p>
          </div>
        )}
      </div>

      <Pagination page={page} total={totalCount} pageSize={pageSize} onPageChange={onPageChange} />
    </section>
  )
}
