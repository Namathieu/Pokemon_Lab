import { useEffect, useMemo, useState } from 'react'
import type { PokemonCard } from '@/types/pokemon'
import { importDeckFromText } from '@/services/deckImporter'
import { useDeckStore } from '@/state/useDeckStore'

type StyleOption = 'balanced' | 'aggro' | 'control' | 'midrange'

interface AIBuilderPageProps {
  cardLibrary: PokemonCard[]
  libraryLoaded: boolean
  onGoToBuilder?: () => void
}

interface AiStatsPayload {
  generatedAt: string
  deckCount: number
  cardUsage: Record<
    string,
    {
      id: string
      name: string
      set: string
      number: string
      deck_count: number
      total_copies: number
    }
  >
}

export function AIBuilderPage({ cardLibrary, libraryLoaded, onGoToBuilder }: AIBuilderPageProps) {
  const [style, setStyle] = useState<StyleOption>('balanced')
  const [seedCards, setSeedCards] = useState<string>('')
  const [aiStats, setAiStats] = useState<AiStatsPayload | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [draftText, setDraftText] = useState<string>('')
  const setDeck = useDeckStore((state) => state.setDeck)

  useEffect(() => {
    const load = async () => {
      setLoadingStats(true)
      try {
        const res = await fetch(`/data/ai-stats.json?cache-bust=${Date.now()}`)
        if (!res.ok) throw new Error(`Failed to load ai-stats.json (${res.status})`)
        const data = (await res.json()) as AiStatsPayload
        setAiStats(data)
      } catch (error) {
        console.error(error)
        setStatus((error as Error).message)
      } finally {
        setLoadingStats(false)
      }
    }
    load()
  }, [])

  const cardUsageList = useMemo(() => {
    if (!aiStats) return []
    return Object.values(aiStats.cardUsage).sort((a, b) => {
      if (b.deck_count !== a.deck_count) return b.deck_count - a.deck_count
      return b.total_copies - a.total_copies
    })
  }, [aiStats])

  const isStandardLegal = (card: PokemonCard) => {
    const mark = (card.regulationMark || '').toUpperCase()
    return ['G', 'H', 'I', 'J', 'K'].includes(mark)
  }

  const findCardInLibrary = (name: string, set: string, number: string) => {
    const targetName = name.trim().toLowerCase()
    const targetSet = set.trim().toLowerCase()
    const targetNumber = number.trim().toLowerCase()
    return (
      cardLibrary.find(
        (c) =>
          c.name?.trim().toLowerCase() === targetName &&
          (c.set?.ptcgoCode?.toLowerCase() === targetSet || c.set?.id?.toLowerCase() === targetSet) &&
          c.number?.trim().toLowerCase() === targetNumber,
      ) ||
      cardLibrary.find(
        (c) =>
          c.name?.trim().toLowerCase() === targetName &&
          c.number?.trim().toLowerCase() === targetNumber &&
          isStandardLegal(c),
      ) ||
      cardLibrary.find((c) => c.name?.trim().toLowerCase() === targetName && isStandardLegal(c))
    )
  }

  const applyStyle = (count: number) => {
    if (style === 'aggro') return Math.min(4, Math.max(1, Math.round(count + 0.75)))
    if (style === 'control') return Math.min(3, Math.max(1, Math.round(count - 0.5)))
    if (style === 'midrange') return Math.min(4, Math.max(1, Math.round(count + 0.25)))
    return Math.min(4, Math.max(1, Math.round(count)))
  }

  const composeDraft = () => {
    if (!aiStats) return { text: '', message: 'AI stats not loaded.' }
    const seeds = seedCards
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase())

    const standardCards = cardUsageList
      .map((cu) => ({
        usage: cu,
        card: findCardInLibrary(cu.name, cu.set, cu.number),
      }))
      .filter((item) => item.card && isStandardLegal(item.card!))

    const scorer = (item: { usage: (typeof cardUsageList)[number]; card: PokemonCard }) => {
      let score = item.usage.deck_count * 2 + item.usage.total_copies
      if (seeds.some((seed) => item.usage.name.toLowerCase().includes(seed))) score *= 1.5
      // Bias by playstyle: aggro favors Basic attackers, control favors trainers/supporters
      if (style === 'aggro') {
        if (item.card.supertype?.toLowerCase() === 'pokémon' && (item.card.subtypes ?? []).some((s) => s.toLowerCase() === 'basic')) {
          score *= 1.2
        }
      }
      if (style === 'control') {
        if (item.card.supertype?.toLowerCase() === 'trainer') score *= 1.2
      }
      return score
    }

    const sorted = [...standardCards].sort((a, b) => scorer(b) - scorer(a))

    // Category targets
    const targets = {
      aggro: { pokemon: 18, trainer: 30, energy: 12 },
      balanced: { pokemon: 16, trainer: 32, energy: 12 },
      midrange: { pokemon: 16, trainer: 32, energy: 12 },
      control: { pokemon: 14, trainer: 36, energy: 10 },
    }[style]

    const result: string[] = []
    let remaining = 60

    const addCard = (line: string, count: number) => {
      result.push(`${count} ${line}`)
      remaining -= count
    }

    const capByRole = { pokemon: targets.pokemon, trainer: targets.trainer, energy: targets.energy }
    const usedCounts = new Map<string, number>()

    for (const item of sorted) {
      if (remaining <= 0) break
      const card = item.card!
      const role = card.supertype?.toLowerCase() ?? 'other'
      if (role === 'energy' && capByRole.energy <= 0) continue
      if (role === 'trainer' && capByRole.trainer <= 0) continue
      if (role === 'pokémon' && capByRole.pokemon <= 0) continue

      const avg = item.usage.deck_count > 0 ? item.usage.total_copies / item.usage.deck_count : 1
      let desired = applyStyle(avg)
      const key = `${card.name}::${card.set?.ptcgoCode ?? card.set?.id ?? ''}::${card.number ?? ''}`
      const already = usedCounts.get(key) ?? 0
      desired = Math.min(4 - already, desired)
      if (desired <= 0) continue

      // Don't overshoot category
      if (role === 'pokémon') desired = Math.min(desired, capByRole.pokemon)
      if (role === 'trainer') desired = Math.min(desired, capByRole.trainer)
      if (role === 'energy') desired = Math.min(desired, capByRole.energy)
      if (desired <= 0) continue

      const line = `${card.name} ${(card.set?.ptcgoCode || card.set?.id || '').toUpperCase()} ${card.number ?? ''}`.trim()
      addCard(line, desired)
      usedCounts.set(key, already + desired)
      if (role === 'pokémon') capByRole.pokemon -= desired
      if (role === 'trainer') capByRole.trainer -= desired
      if (role === 'energy') capByRole.energy -= desired
    }

    // If still missing, pad with most common trainers/energies
    if (remaining > 0) {
      for (const item of sorted) {
        if (remaining <= 0) break
        const card = item.card!
        const role = card.supertype?.toLowerCase() ?? 'other'
        if (role === 'energy' && capByRole.energy <= 0) continue
        if (role === 'trainer' && capByRole.trainer <= 0) continue
        if (role === 'pokémon' && capByRole.pokemon <= 0) continue
        const key = `${card.name}::${card.set?.ptcgoCode ?? card.set?.id ?? ''}::${card.number ?? ''}`
        const already = usedCounts.get(key) ?? 0
        let desired = Math.min(4 - already, remaining, role === 'energy' ? Math.max(1, capByRole.energy) : 1)
        if (desired <= 0) continue
        const line = `${card.name} ${(card.set?.ptcgoCode || card.set?.id || '').toUpperCase()} ${card.number ?? ''}`.trim()
        addCard(line, desired)
        usedCounts.set(key, already + desired)
        if (role === 'pokémon') capByRole.pokemon -= desired
        if (role === 'trainer') capByRole.trainer -= desired
        if (role === 'energy') capByRole.energy -= desired
      }
    }

    return { text: result.join('\n'), message: `Draft generated (${60 - remaining}/60 cards).` }
  }

  const generateDraft = () => {
    const res = composeDraft()
    setDraftText(res.text)
    setStatus(res.message)
  }

  const sendToBuilder = async () => {
    if (!draftText.trim()) {
      setStatus('Generate a draft first.')
      return
    }
    if (!libraryLoaded || cardLibrary.length === 0) {
      setStatus('Card library not loaded. Run sync and reload.')
      return
    }
    const result = await importDeckFromText(draftText, { cards: cardLibrary })
    if (!result.entries.length) {
      setStatus('Failed to import draft into builder.')
      return
    }
    const outcome = setDeck(result.entries, result.deckName ?? 'AI Draft')
    if (!outcome.success) {
      setStatus(outcome.issues[0] ?? 'Unable to load into builder.')
      return
    }
    setStatus('Draft loaded into Deck Builder.')
    onGoToBuilder?.()
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/60'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.4em] text-emerald-300'>AI Builder</p>
            <h2 className='text-3xl font-bold text-white'>Generate a draft deck from meta stats</h2>
            <p className='mt-2 max-w-3xl text-sm text-slate-300'>
              Uses your imported Limitless decks (ai-stats) to propose a 60-card draft. You can nudge with playstyle and
              seed cards. Then send it into Deck Builder to tweak.
            </p>
          </div>
        </div>

        <div className='mt-4 grid gap-4 md:grid-cols-[1fr,1fr]'>
          <label className='block text-sm font-semibold text-slate-200'>
            Playstyle bias
            <select
              className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
              value={style}
              onChange={(e) => setStyle(e.target.value as StyleOption)}
            >
              <option value='balanced'>Balanced</option>
              <option value='aggro'>Aggro</option>
              <option value='midrange'>Midrange</option>
              <option value='control'>Control</option>
            </select>
          </label>
          <label className='block text-sm font-semibold text-slate-200'>
            Seed cards (optional, comma-separated)
            <input
              className='mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none'
              placeholder='e.g., Gardevoir, Rare Candy'
              value={seedCards}
              onChange={(e) => setSeedCards(e.target.value)}
            />
          </label>
        </div>

        <div className='mt-4 flex flex-wrap gap-3'>
          <button
            className='rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400'
            onClick={generateDraft}
            disabled={loadingStats}
          >
            {loadingStats ? 'Loading stats...' : 'Generate draft'}
          </button>
          <button
            className='rounded-xl border border-sky-400/70 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50'
            onClick={sendToBuilder}
            disabled={!draftText}
          >
            Send to Deck Builder
          </button>
        </div>

        {status && (
          <div className='mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100'>
            {status}
          </div>
        )}

        <div className='mt-4'>
          <label className='text-sm font-semibold text-slate-200'>
            Draft (text)
            <textarea
              className='mt-1 h-56 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none'
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder='Generated deck list will appear here...'
            />
          </label>
        </div>
      </div>
    </div>
  )
}
