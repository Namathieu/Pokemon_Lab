import { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Flame, Minus, Plus, Trash2, Upload } from 'lucide-react'
import { computeDeckStats } from '@/utils/deckFormatting'
import { buildPokemonNameIndex, compareDeckEntries } from '@/utils/cardOrdering'
import { MAX_DECK_SIZE, useDeckStore } from '@/state/useDeckStore'
import type { DeckEntry, PokemonCard } from '@/types/pokemon'
import { DeckImportExportDialog } from './DeckImportExportDialog'
import { importDeckFromText } from '@/services/deckImporter'
import { useDeckLibraryStore } from '@/state/useDeckLibraryStore'
import { getLocalCardImage, imageErrorHandler } from '@/utils/cardImages'

export const DECK_DROPPABLE_ID = 'deck-panel-drop-zone'

function DeckCardRow({
  entry,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  entry: DeckEntry
  onIncrement(): void
  onDecrement(): void
  onRemove(): void
}) {
  return (
        <div className='flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/50 p-3'>
          <img
            src={getLocalCardImage(entry.card)}
            onError={imageErrorHandler(entry.card)}
            alt={entry.card.name}
            className='h-20 w-auto rounded-xl border border-white/10'
            draggable={false}
          />
      <div className='flex flex-1 flex-col'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-semibold text-white'>{entry.card.name}</p>
            <p className='text-xs text-slate-400'>
              {entry.card.supertype} · {entry.card.set?.name}
            </p>
          </div>
          <button
            className='rounded-full border border-rose-500/50 p-2 text-rose-300 transition hover:bg-rose-500/10'
            onClick={onRemove}
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className='mt-3 flex items-center justify-between text-sm'>
          <div className='inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-slate-900/80 px-2 py-1 text-xs text-slate-200'>
            <span>{entry.card.types?.join(' · ') ?? 'Colorless'}</span>
          </div>
          <div className='inline-flex items-center gap-2'>
            <button
              className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600/60 text-slate-200 transition hover:border-slate-400'
              onClick={onDecrement}
            >
              <Minus size={14} />
            </button>
            <span className='w-8 text-center text-lg font-semibold text-white'>{entry.count}</span>
            <button
              className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/60 text-emerald-100 transition hover:border-emerald-300'
              onClick={onIncrement}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DeckPanelProps {
  cardLibrary: PokemonCard[]
  libraryLoaded: boolean
}

export function DeckPanel({ cardLibrary, libraryLoaded }: DeckPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLibraryDeckId, setSelectedLibraryDeckId] = useState<string>('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const {
    deckName,
    cards,
    renameDeck,
    incrementCard,
    decrementCard,
    removeCard,
    clearDeck,
    exportText,
    setDeck,
    lastError,
    acknowledgeError,
  } = useDeckStore()
  const libraryDecks = useDeckLibraryStore((state) => state.decks)
  const addHomebrewDeck = useDeckLibraryStore((state) => state.addHomebrewDeck)

  const pokemonNameIndex = useMemo(() => buildPokemonNameIndex(cardLibrary), [cardLibrary])

  const entries = useMemo(
    () => Object.values(cards).sort((a, b) => compareDeckEntries(a, b, pokemonNameIndex)),
    [cards, pokemonNameIndex],
  )

  const rankingValue = (ranking?: string) => {
    if (!ranking) return Number.POSITIVE_INFINITY
    const match = ranking.match(/\d+/)
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY
  }

  const sortedLibraryDecks = useMemo(() => {
    const decksCopy = [...libraryDecks]
    decksCopy.sort((a, b) => {
      const ra = rankingValue(a.ranking)
      const rb = rankingValue(b.ranking)
      if (ra !== rb) return ra - rb
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    return decksCopy
  }, [libraryDecks])

  const stats = useMemo(() => computeDeckStats(entries), [entries])
  const { isOver, setNodeRef } = useDroppable({ id: DECK_DROPPABLE_ID })

  const handleImport = async (text: string) => {
    if (!libraryLoaded || cardLibrary.length === 0) {
      return {
        errors: ['Local card library not loaded. Run "npm run sync:cards" and reload.'],
        message: 'Card library unavailable.',
      }
    }
    const result = await importDeckFromText(text, { cards: cardLibrary })
    let importOutcome = { success: false, issues: [] as string[] }
    if (result.entries.length) {
      importOutcome = setDeck(result.entries, result.deckName)
    }
    const totalImported = result.entries.reduce((sum, entry) => sum + entry.count, 0)
    const combinedErrors = [...result.errors, ...(importOutcome.issues ?? [])]
    return {
      errors: combinedErrors,
      message:
        result.entries.length === 0
          ? 'No cards imported. Please double-check your list.'
        : importOutcome.success
            ? `Imported ${totalImported} cards.`
            : combinedErrors[0] ?? 'Deck import failed.',
    }
  }

  const handleLoadFromLibrary = () => {
    if (!selectedLibraryDeckId) return
    const deck = sortedLibraryDecks.find((item) => item.id === selectedLibraryDeckId)
    if (!deck) return
    setDeck(deck.entries, deck.deckName)
    setSaveMessage(null)
  }

  const handleSaveHomebrew = () => {
    const entries = Object.values(cards)
    if (!entries.length) {
      setSaveMessage('Add cards before saving.')
      return
    }
    const result = addHomebrewDeck({ deckName, entries })
    setSaveMessage(result.message)
  }

  return (
    <section
      ref={setNodeRef}
      className={`flex h-full flex-col rounded-3xl border border-white/10 p-4 shadow-2xl shadow-black/50 ${
        isOver ? 'bg-emerald-500/10' : 'bg-slate-950/60'
      }`}
    >
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='min-w-[200px] flex-1'>
            <p className='text-xs uppercase tracking-[0.3em] text-slate-500'>Your Deck</p>
            <input
              className='mt-1 w-full rounded-xl border border-transparent bg-transparent text-2xl font-semibold text-white focus:border-emerald-400 focus:outline-none'
              value={deckName}
              onChange={(event) => renameDeck(event.target.value)}
            />
          </div>
          <div className='flex flex-wrap gap-2'>
            <button
              className='inline-flex items-center gap-1 rounded-full border border-slate-600/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-400 hover:text-rose-200'
              onClick={clearDeck}
            >
              <Trash2 size={14} />
              Clear
            </button>
            <button
              className='inline-flex items-center gap-1 rounded-full border border-emerald-400/70 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/10'
              onClick={() => setDialogOpen(true)}
            >
              <Upload size={14} />
              Import / Export
            </button>
          </div>
        </div>
        {sortedLibraryDecks.length > 0 && (
          <div className='flex flex-wrap items-center gap-2'>
            <select
              className='w-full min-w-[220px] max-w-xs rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none sm:w-72'
              value={selectedLibraryDeckId}
              onChange={(event) => setSelectedLibraryDeckId(event.target.value)}
            >
              <option value=''>Load saved deck...</option>
              {sortedLibraryDecks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.deckName}
                  {deck.tournamentTag ? ` (${deck.tournamentTag}${deck.eventDate ? ` · ${deck.eventDate}` : ''})` : ''}
                  {deck.ranking ? ` · ${deck.ranking}` : ''}
                </option>
              ))}
            </select>
            <button
              className='rounded-full border border-sky-400/70 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={handleLoadFromLibrary}
              disabled={!selectedLibraryDeckId}
            >
              Load
            </button>
          </div>
        )}
        <div className='flex flex-wrap items-center gap-2'>
          <button
            className='rounded-full border border-emerald-400/70 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/10'
            onClick={handleSaveHomebrew}
          >
            Save as Homebrew
          </button>
          {saveMessage && <span className='text-xs text-slate-300'>{saveMessage}</span>}
        </div>
      </div>

      <div className='mt-4 rounded-2xl border border-white/5 bg-slate-900/50 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-col'>
            <span className='text-xs uppercase tracking-wide text-slate-400'>Total cards</span>
            <span className='text-3xl font-extrabold text-white'>
              {stats.total} / {MAX_DECK_SIZE}
            </span>
          </div>
          <div className='flex flex-wrap gap-2 text-xs'>
            {Object.entries(stats.countsBySupertype).map(([label, count]) => (
              <div
                key={label}
                className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200'
              >
                {label}: {count}
              </div>
            ))}
          </div>
        </div>
        <div className='mt-4 h-2 w-full rounded-full bg-slate-800'>
          <div
            className='h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all'
            style={{ width: `${Math.min(100, (stats.total / MAX_DECK_SIZE) * 100)}%` }}
          />
        </div>
        <p className='mt-2 text-xs text-slate-400'>
          {stats.remaining > 0
            ? `${stats.remaining} cards remaining to reach a full Standard deck.`
            : stats.total === MAX_DECK_SIZE
              ? 'Deck is ready for battle!'
              : 'Deck exceeds the allowed size. Remove cards to continue.'}
        </p>
      </div>

      <div className='mt-4 flex-1 space-y-3 overflow-y-auto pr-1'>
        {entries.length === 0 ? (
          <div className='flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-slate-400'>
            <Flame size={32} className='text-emerald-300' />
            <p className='mt-2 text-base font-semibold text-white'>Drop cards here to start building</p>
            <p className='text-sm text-slate-400'>
              Drag cards from the center grid or click “Add” on any card tile.
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <DeckCardRow
              key={entry.card.id}
              entry={entry}
              onIncrement={() => incrementCard(entry.card.id)}
              onDecrement={() => decrementCard(entry.card.id)}
              onRemove={() => removeCard(entry.card.id)}
            />
          ))
        )}
      </div>

      {!stats.standardLegal && (
        <div className='mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
          Some cards in this list are not marked as Standard legal.
        </div>
      )}

      {lastError && (
        <div className='mt-4 rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-50'>
          {lastError}
          <button className='ml-3 text-xs underline' onClick={acknowledgeError}>
            Dismiss
          </button>
        </div>
      )}

      <DeckImportExportDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        exportedText={exportText()}
        deckName={deckName}
        onImport={handleImport}
      />
    </section>
  )
}
