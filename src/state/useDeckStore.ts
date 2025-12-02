import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DeckEntry, PokemonCard } from '@/types/pokemon'
import { formatDeckAsText } from '@/utils/deckFormatting'

const MAX_DECK_CARDS = 60
const MAX_CARD_COPIES = 4

type DeckMap = Record<string, DeckEntry>

export const isBasicEnergy = (card: PokemonCard) =>
  card.supertype === 'Energy' &&
  (card.subtypes ?? []).some((subtype) => subtype.toLowerCase() === 'basic')

const totalCount = (cards: DeckMap) =>
  Object.values(cards).reduce((sum, entry) => sum + entry.count, 0)

const normalizeName = (value: string) => value.trim().toLowerCase()

const copiesOfName = (cards: DeckMap, name: string) => {
  const target = normalizeName(name)
  return Object.values(cards).reduce((sum, entry) => {
    return normalizeName(entry.card.name) === target ? sum + entry.count : sum
  }, 0)
}

function canAddCard(card: PokemonCard, cards: DeckMap) {
  const total = totalCount(cards)
  const existing = cards[card.id]

  if (!existing && total >= MAX_DECK_CARDS) {
    return { allowed: false, reason: 'Deck already has 60 cards.' }
  }

  if (existing && total >= MAX_DECK_CARDS && isBasicEnergy(card) === false) {
    return { allowed: false, reason: 'Deck is full. Remove a card before adding more.' }
  }

  if (!isBasicEnergy(card)) {
    const copies = existing ? existing.count : 0
    if (copies >= MAX_CARD_COPIES) {
      return { allowed: false, reason: 'You can only run four copies of this card.' }
    }

    const nameCopies = copiesOfName(cards, card.name)
    if (nameCopies >= MAX_CARD_COPIES) {
      return { allowed: false, reason: `You already have four cards named ${card.name}.` }
    }
  }

  return { allowed: true }
}

function validateEntries(entries: DeckEntry[]) {
  const issues: string[] = []
  const total = entries.reduce((sum, entry) => sum + entry.count, 0)
  if (total > MAX_DECK_CARDS) {
    issues.push(`Deck has ${total} cards. The Standard limit is ${MAX_DECK_CARDS}.`)
  }

  const nameCounts = new Map<string, { count: number; label: string }>()
  entries.forEach((entry) => {
    if (isBasicEnergy(entry.card)) {
      return
    }

    const key = normalizeName(entry.card.name)
    const snapshot = nameCounts.get(key) ?? { count: 0, label: entry.card.name }
    snapshot.count += entry.count
    nameCounts.set(key, snapshot)

    if (entry.count > MAX_CARD_COPIES) {
      issues.push(`${entry.card.name} exceeds the four-copy limit.`)
    }
  })

  nameCounts.forEach(({ count, label }) => {
    if (count > MAX_CARD_COPIES) {
      issues.push(`${label} exceeds the four-copy limit across printings.`)
    }
  })

  return issues
}

export interface DeckState {
  deckName: string
  cards: DeckMap
  lastError?: string
  addCard(card: PokemonCard): void
  incrementCard(cardId: string): void
  decrementCard(cardId: string): void
  removeCard(cardId: string): void
  renameDeck(name: string): void
  clearDeck(): void
  setDeck(
    entries: DeckEntry[],
    deckName?: string,
  ): {
    success: boolean
    issues: string[]
  }
  exportText(): string
  acknowledgeError(): void
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      deckName: 'Untitled Deck',
      cards: {},
      lastError: undefined,
      addCard: (card) =>
        set((state) => {
          const check = canAddCard(card, state.cards)
          if (!check.allowed) {
            return { ...state, lastError: check.reason }
          }
          const next = { ...state.cards }
          const existing = next[card.id]
          if (existing) {
            next[card.id] = { ...existing, count: existing.count + 1 }
          } else {
            next[card.id] = { card, count: 1 }
          }
          return { cards: next, lastError: undefined }
        }),
      incrementCard: (cardId) =>
        set((state) => {
          const entry = state.cards[cardId]
          if (!entry) return state
          const check = canAddCard(entry.card, state.cards)
          if (!check.allowed) {
            return { ...state, lastError: check.reason }
          }
          const next = { ...state.cards }
          next[cardId] = { ...entry, count: entry.count + 1 }
          return { cards: next, lastError: undefined }
        }),
      decrementCard: (cardId) =>
        set((state) => {
          const entry = state.cards[cardId]
          if (!entry) return state
          const next = { ...state.cards }
          if (entry.count <= 1) {
            delete next[cardId]
          } else {
            next[cardId] = { ...entry, count: entry.count - 1 }
          }
          return { cards: next, lastError: undefined }
        }),
      removeCard: (cardId) =>
        set((state) => {
          if (!state.cards[cardId]) return state
          const next = { ...state.cards }
          delete next[cardId]
          return { cards: next, lastError: undefined }
        }),
      renameDeck: (name) => set({ deckName: name }),
      clearDeck: () => set({ cards: {}, lastError: undefined }),
      setDeck: (entries, incomingName) => {
        const issues = validateEntries(entries)
        if (issues.length) {
          set({ lastError: issues.join(' ') })
          return { success: false, issues }
        }
        const next: DeckMap = {}
        entries.forEach((entry) => {
          next[entry.card.id] = { card: entry.card, count: entry.count }
        })
        set({
          cards: next,
          deckName: incomingName?.trim() ? incomingName.trim() : get().deckName,
          lastError: undefined,
        })
        return { success: true, issues: [] }
      },
      exportText: () => {
        const entries = Object.values(get().cards)
        return formatDeckAsText(get().deckName, entries)
      },
      acknowledgeError: () => set({ lastError: undefined }),
    }),
    {
      name: 'pokedeck-state',
      partialize: (state) => ({
        deckName: state.deckName,
        cards: state.cards,
      }),
    },
  ),
)

export const MAX_DECK_SIZE = MAX_DECK_CARDS
