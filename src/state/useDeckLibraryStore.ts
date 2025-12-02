import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { importDeckFromText } from '@/services/deckImporter'
import type { DeckEntry, PokemonCard } from '@/types/pokemon'

export interface StoredDeck {
  id: string
  deckName: string
  tournamentTag?: string
  player?: string
  ranking?: string
  eventDate?: string
  importText: string
  entries: DeckEntry[]
  createdAt: string
}

interface DeckLibraryState {
  decks: StoredDeck[]
  addDeckFromImport(
    input: {
      text: string
      deckName?: string
      tournamentTag?: string
      player?: string
      ranking?: string
      eventDate?: string
    },
    cards: PokemonCard[],
  ): Promise<{ success: boolean; message: string; errors: string[] }>
  removeDeck(id: string): void
  clear(): void
}

const makeId = () => crypto.randomUUID?.() ?? `deck_${Math.random().toString(36).slice(2)}`

export const useDeckLibraryStore = create<DeckLibraryState>()(
  persist(
    (set, get) => ({
      decks: [],
      async addDeckFromImport(input, cards) {
        const errors: string[] = []
        const result = await importDeckFromText(input.text, { cards })

        if (!result.entries.length) {
          return {
            success: false,
            message: 'No cards imported. Please verify the deck list.',
            errors: result.errors,
          }
        }

        if (result.errors.length) {
          errors.push(...result.errors)
        }

        const resolvedName =
          input.deckName?.trim() ||
          result.deckName?.trim() ||
          `Imported Deck ${new Date().toLocaleDateString()}`

        const next: StoredDeck = {
          id: makeId(),
          deckName: resolvedName,
          tournamentTag: input.tournamentTag?.trim(),
          player: input.player?.trim(),
          ranking: input.ranking?.trim(),
          eventDate: input.eventDate,
          importText: input.text.trim(),
          entries: result.entries,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          decks: [next, ...state.decks],
        }))

        return {
          success: true,
          message: errors.length
            ? `Imported with warnings (${result.entries.length} cards).`
            : `Imported ${result.entries.length} cards.`,
          errors,
        }
      },
      removeDeck(id) {
        set((state) => ({ decks: state.decks.filter((deck) => deck.id !== id) }))
      },
      clear() {
        set({ decks: [] })
      },
    }),
    {
      name: 'deck-library',
    },
  ),
)
