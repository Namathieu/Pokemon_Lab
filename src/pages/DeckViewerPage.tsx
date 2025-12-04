import { useMemo, useState } from 'react'
import { useDeckLibraryStore } from '@/state/useDeckLibraryStore'
import { getLocalCardImage, imageErrorHandler } from '@/utils/cardImages'

export function DeckViewerPage() {
  const decks = useDeckLibraryStore((state) => state.decks)
  const events = useDeckLibraryStore((state) => state.events)
  const [selectedEventId, setSelectedEventId] = useState<string>('all')
  const [selectedDeckId, setSelectedDeckId] = useState<string>('')

  const eventMap = useMemo(() => {
    const map = new Map<string, string>()
    events.forEach((evt) => {
      map.set(evt.id, `${evt.name}${evt.date ? ` (${evt.date})` : ''}`)
    })
    return map
  }, [events])

  const hasHomebrewDeck = useMemo(() => decks.some((d) => d.eventId === 'homebrew'), [decks])
  const eventOptions = useMemo(() => {
    const list = [...events]
    if (hasHomebrewDeck && !events.find((evt) => evt.id === 'homebrew')) {
      list.push({ id: 'homebrew', name: 'Homebrew', createdAt: new Date().toISOString() })
    }
    return list
  }, [events, hasHomebrewDeck])

  const rankingValue = (ranking?: string) => {
    if (!ranking) return Number.POSITIVE_INFINITY
    const match = ranking.match(/\d+/)
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY
  }

  const filteredDecks = useMemo(() => {
    const list = selectedEventId === 'all'
      ? decks
      : decks.filter((deck) => deck.eventId === selectedEventId)
    return [...list].sort((a, b) => {
      const ra = rankingValue(a.ranking)
      const rb = rankingValue(b.ranking)
      if (ra !== rb) return ra - rb
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [decks, selectedEventId])

  const selectedDeck = filteredDecks.find((deck) => deck.id === selectedDeckId)

  const groupedBySupertype = useMemo(() => {
    if (!selectedDeck) return []
    const groups: Record<string, typeof selectedDeck.entries> = {}
    selectedDeck.entries.forEach((entry) => {
      const key = entry.card.supertype ?? 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })
    const priority = (label: string) => {
      const norm = label.toLowerCase()
      if (norm === 'pokemon' || norm === 'pokémon' || norm === 'pokacmon') return 0
      if (norm === 'trainer') return 1
      if (norm === 'energy') return 2
      return 3
    }
    return Object.entries(groups).sort((a, b) => {
      const pa = priority(a[0])
      const pb = priority(b[0])
      if (pa !== pb) return pa - pb
      return a[0].localeCompare(b[0])
    })
  }, [selectedDeck])

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/60'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.4em] text-emerald-300'>Deck Viewer</p>
            <h2 className='text-3xl font-bold text-white'>Browse stored decks in card view</h2>
            <p className='mt-2 max-w-3xl text-sm text-slate-300'>
              Pick an event and deck to see its cards in a visual grid, including player, ranking, and date.
            </p>
          </div>
        </div>

        <div className='mt-4 grid gap-3 md:grid-cols-[1.2fr,1.8fr]'>
          <div className='space-y-3'>
            <label className='block text-sm font-semibold text-slate-200'>
              Event filter
              <select
                className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value)
                  setSelectedDeckId('')
                }}
              >
                <option value='all'>All events</option>
                {eventOptions.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} {evt.date ? `(${evt.date})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className='block text-sm font-semibold text-slate-200'>
              Deck
              <select
                className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
              >
                <option value=''>Select a deck...</option>
                {filteredDecks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.deckName}
                    {deck.tournamentTag ? ` (${deck.tournamentTag}${deck.eventDate ? ` · ${deck.eventDate}` : ''})` : ''}
                    {deck.ranking ? ` · ${deck.ranking}` : ''}
                    {deck.player ? ` · ${deck.player}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedDeck && (
              <div className='rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-100'>
                <p className='text-lg font-semibold text-white'>{selectedDeck.deckName}</p>
                <p className='text-xs text-slate-400'>
                  {selectedDeck.player ? `Player: ${selectedDeck.player} · ` : ''}
                  {selectedDeck.ranking ? `Ranking: ${selectedDeck.ranking} · ` : ''}
                  Event: {eventMap.get(selectedDeck.eventId ?? '') ?? (selectedDeck.eventId === 'homebrew' ? 'Homebrew' : 'Untagged')}
                </p>
                <p className='mt-1 text-xs text-slate-400'>
                  Saved {new Date(selectedDeck.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className='rounded-2xl border border-white/10 bg-slate-900/50 p-4'>
            {!selectedDeck ? (
              <p className='text-sm text-slate-400'>Choose a deck to view its cards.</p>
            ) : (
              <div className='space-y-4'>
                {groupedBySupertype.map(([supertype, entries]) => (
                  <div key={supertype} className='space-y-2'>
                    <p className='text-sm font-semibold text-slate-200'>{supertype}</p>
                    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                      {entries.map((entry) => (
                        <div
                          key={entry.card.id + entry.card.number}
                          className='overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-lg shadow-black/30'
                        >
                          <img
                            src={getLocalCardImage(entry.card)}
                            onError={imageErrorHandler(entry.card)}
                            alt={entry.card.name}
                            className='h-52 w-full object-contain bg-slate-950'
                            draggable={false}
                          />
                          <div className='border-t border-white/10 px-3 py-2 text-xs text-slate-200'>
                            <div className='flex items-center gap-2'>
                              <span className='inline-flex items-center rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-50'>
                                x{entry.count}
                              </span>
                              <div>
                                <p className='font-semibold leading-snug text-white'>{entry.card.name}</p>
                                <p className='text-slate-400'>{entry.card.set?.name}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
