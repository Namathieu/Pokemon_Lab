import { useMemo, useState } from 'react'
import type { PokemonCard } from '@/types/pokemon'
import { useDeckLibraryStore } from '@/state/useDeckLibraryStore'

interface DeckLibraryPageProps {
  cardLibrary: PokemonCard[]
  libraryLoaded: boolean
  onGoToEvents?(): void
}

export function DeckLibraryPage({ cardLibrary, libraryLoaded, onGoToEvents }: DeckLibraryPageProps) {
  const [deckText, setDeckText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [player, setPlayer] = useState('')
  const [ranking, setRanking] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string; errors?: string[] } | null>(
    null,
  )

  const decks = useDeckLibraryStore((state) => state.decks)
  const events = useDeckLibraryStore((state) => state.events)
  const addDeckFromImport = useDeckLibraryStore((state) => state.addDeckFromImport)
  const removeDeck = useDeckLibraryStore((state) => state.removeDeck)

  const sortedDecks = useMemo(
    () =>
      [...decks].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    [decks],
  )

  const groupedByTournament = useMemo(() => {
    const map = new Map<string, typeof sortedDecks>()
    sortedDecks.forEach((deck) => {
      const key = deck.tournamentTag?.trim() || 'Untagged'
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(deck)
    })
    return Array.from(map.entries())
  }, [sortedDecks])

  const exportTrainingData = () => {
    const exportable = sortedDecks.filter((deck) => deck.eventId !== 'homebrew')
    if (exportable.length === 0) {
      setFeedback({ variant: 'error', message: 'No stored decks to export.' })
      return
    }

    const samples = exportable.map((deck) => {
      const totalCards = deck.entries.reduce((sum, entry) => sum + entry.count, 0)
      const countsBySupertype: Record<string, number> = {}
      const typesFrequency: Record<string, number> = {}
      deck.entries.forEach((entry) => {
        const supertype = entry.card.supertype ?? 'Other'
        countsBySupertype[supertype] = (countsBySupertype[supertype] ?? 0) + entry.count
        entry.card.types?.forEach((type) => {
          typesFrequency[type] = (typesFrequency[type] ?? 0) + entry.count
        })
      })

      return {
        deck_id: deck.id,
        deck_name: deck.deckName,
        tournament_tag: deck.tournamentTag,
        event_id: deck.eventId,
        player: deck.player,
        ranking: deck.ranking,
        event_date: deck.eventDate,
        created_at: deck.createdAt,
        total_cards: totalCards,
        counts_by_supertype: countsBySupertype,
        types_frequency: typesFrequency,
        cards: deck.entries.map((entry) => ({
          count: entry.count,
          name: entry.card.name,
          supertype: entry.card.supertype,
          subtypes: entry.card.subtypes,
          types: entry.card.types,
          rules: entry.card.rules,
          attacks: entry.card.attacks,
          abilities: entry.card.abilities,
          weaknesses: entry.card.weaknesses,
          resistances: entry.card.resistances,
          retreatCost: entry.card.retreatCost,
          set: {
            id: entry.card.set?.id,
            name: entry.card.set?.name,
            ptcgoCode: entry.card.set?.ptcgoCode,
          },
          number: entry.card.number,
          regulationMark: entry.card.regulationMark,
          rarity: entry.card.rarity,
        })),
        raw_import: deck.importText,
      }
    })

    const jsonl = samples.map((sample) => JSON.stringify(sample)).join('\n')
    const blob = new Blob([jsonl], { type: 'application/jsonl;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `deck-training-${new Date().toISOString().slice(0, 10)}.jsonl`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setFeedback({ variant: 'success', message: 'Exported training JSONL.' })
  }

  const handleImport = async () => {
    setIsSaving(true)
    setFeedback(null)
    try {
      if (!selectedEventId) {
        setFeedback({
          variant: 'error',
          message: 'Select an event before importing a deck.',
        })
        return
      }
      if (!libraryLoaded) {
        setFeedback({
          variant: 'error',
          message: 'Card library is not loaded. Run sync and reload, then try again.',
        })
        return
      }
      const result = await addDeckFromImport(
        {
          text: deckText,
          deckName,
          eventId: selectedEventId,
          player,
          ranking,
        },
        cardLibrary,
      )
      if (result.success) {
        setFeedback({ variant: 'success', message: result.message, errors: result.errors })
        setDeckText('')
      } else {
        setFeedback({ variant: 'error', message: result.message, errors: result.errors })
      }
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: (error as Error).message ?? 'Unable to import deck.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/60'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.4em] text-emerald-300'>Deck Library</p>
            <h2 className='text-3xl font-bold text-white'>Store multiple decks with tournament context</h2>
            <p className='mt-2 max-w-3xl text-sm text-slate-300'>
              Import decks in the Pokemon TCG text format and tag them with tournament metadata (event, player, date,
              placing). These entries are stored locally for future analysis.
            </p>
          </div>
          <div className='flex flex-col gap-2 text-sm text-emerald-100'>
            <div className='rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-3'>
              Card data loaded: <span className='font-semibold'>{libraryLoaded ? 'Yes' : 'No'}</span>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100'>
              <p className='text-xs uppercase tracking-[0.3em] text-slate-400'>Event</p>
              <div className='mt-2 flex flex-col gap-2'>
              <div className='grid gap-2'>
                <select
                  className='rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  <option value='' disabled>
                    Select an event
                  </option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} {evt.date ? `(${evt.date})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  className='rounded-xl border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/10'
                  onClick={() => onGoToEvents?.()}
                >
                  Manage events
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-4 md:grid-cols-2'>
          <div className='space-y-3'>
            <label className='block text-sm font-semibold text-slate-200'>
              Deck name
              <input
                className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
                placeholder='e.g., Gholdengo Control'
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
              />
            </label>
            <div className='grid gap-3 md:grid-cols-2'>
              <label className='block text-sm font-semibold text-slate-200'>
                Player
                <input
                  className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
                  placeholder='Player name'
                  value={player}
                  onChange={(e) => setPlayer(e.target.value)}
                />
              </label>
              <label className='block text-sm font-semibold text-slate-200'>
                Ranking
                <input
                  className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
                  placeholder='e.g., 2nd, Top 8, 12-3'
                  value={ranking}
                  onChange={(e) => setRanking(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className='flex flex-col'>
            <label className='text-sm font-semibold text-slate-200'>
              Deck list (Pokemon TCG text format)
              <textarea
                className='mt-1 h-64 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none'
                placeholder='Paste the deck text here...'
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
              />
            </label>
            <div className='mt-3 flex gap-2'>
              <button
                className='flex-1 rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400'
                onClick={handleImport}
                disabled={isSaving || deckText.trim().length === 0}
              >
                {isSaving ? 'Importing...' : 'Import and store'}
              </button>
              <button
                className='rounded-xl border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white'
                onClick={() => {
                  setDeckText('')
                  setDeckName('')
                  setPlayer('')
                  setRanking('')
                  setFeedback(null)
                }}
              >
                Reset
              </button>
            </div>
            {feedback && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  feedback.variant === 'success'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-400/60 bg-rose-500/10 text-rose-100'
                }`}
              >
                {feedback.message}
                {feedback.errors?.length ? (
                  <ul className='mt-2 list-disc space-y-1 pl-4 text-xs'>
                    {feedback.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/60'>
        <div className='flex items-center justify-between'>
          <h3 className='text-2xl font-semibold text-white'>Stored decks</h3>
          <div className='flex items-center gap-3 text-sm text-slate-400'>
            <p>Total: {sortedDecks.length} (Homebrew decks stay local, excluded from exports)</p>
            <button
              className='rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-100'
              onClick={exportTrainingData}
            >
              Export training JSONL
            </button>
          </div>
        </div>
        {sortedDecks.length === 0 ? (
          <p className='mt-3 text-sm text-slate-400'>No decks stored yet.</p>
        ) : (
          <div className='mt-4 space-y-6'>
            {groupedByTournament.map(([tag, tagDecks]) => (
              <div key={tag} className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-lg font-semibold text-slate-100'>
                    {tag === 'Untagged' ? 'Untagged' : tag} ({tagDecks.length})
                  </h4>
                </div>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                  {tagDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className='rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-100'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-base font-semibold text-white'>{deck.deckName}</p>
                          <p className='text-xs text-slate-400'>
                            Saved {new Date(deck.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          className='rounded-full border border-rose-500/60 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/10'
                          onClick={() => removeDeck(deck.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className='mt-2 space-y-1 text-xs text-slate-300'>
                        {deck.player ? <p>Player: {deck.player}</p> : null}
                        {deck.ranking ? <p>Ranking: {deck.ranking}</p> : null}
                        {deck.eventDate ? <p>Date: {deck.eventDate}</p> : null}
                        <p>Cards: {deck.entries.reduce((sum, entry) => sum + entry.count, 0)}</p>
                        <p>Unique cards: {deck.entries.length}</p>
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
  )
}
