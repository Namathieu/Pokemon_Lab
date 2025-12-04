import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { importDeckFromText } from '@/services/deckImporter'
import type { DeckEntry, PokemonCard } from '@/types/pokemon'

export interface StoredDeck {
  id: string
  deckName: string
  eventId?: string
  tournamentTag?: string
  player?: string
  ranking?: string
  eventDate?: string
  importText: string
  entries: DeckEntry[]
  createdAt: string
}

export interface DeckEvent {
  id: string
  name: string
  date?: string
  createdAt: string
}

interface DeckLibraryState {
  decks: StoredDeck[]
  events: DeckEvent[]
  importedSources: string[]
  addEvent(input: { name: string; date?: string }): DeckEvent
  addHomebrewDeck(input: { deckName: string; entries: DeckEntry[] }): { success: boolean; message: string }
  removeEvent(id: string): { removedDecks: number; removedEvent: boolean }
  addDeckFromImport(
    input: {
      text: string
      deckName?: string
      tournamentTag?: string
      eventId?: string
      player?: string
      ranking?: string
      eventDate?: string
    },
    cards: PokemonCard[],
  ): Promise<{ success: boolean; message: string; errors: string[] }>
  removeDeck(id: string): void
  hasImportedSource(source: string): boolean
  markImportedSource(source: string): void
  clear(): void
}

const makeId = () => crypto.randomUUID?.() ?? `deck_${Math.random().toString(36).slice(2)}`

export const useDeckLibraryStore = create<DeckLibraryState>()(
  persist(
    (set, get) => ({
      decks: [],
      events: [
        {
          id: 'untagged',
          name: 'Untagged',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'homebrew',
          name: 'Homebrew',
          createdAt: new Date().toISOString(),
        },
      ],
      importedSources: [],
      addEvent(input) {
        const id = makeId()
        const event: DeckEvent = {
          id,
          name: input.name.trim() || 'Untitled Event',
          date: input.date,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ events: [event, ...state.events] }))
        return event
      },
      addHomebrewDeck(input) {
        if (!input.entries.length) {
          return { success: false, message: 'No cards to save.' }
        }
        const deck: StoredDeck = {
          id: makeId(),
          deckName: input.deckName?.trim() || 'Homebrew Deck',
          eventId: 'homebrew',
          tournamentTag: 'Homebrew',
          importText: '[manual]',
          entries: input.entries,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          decks: [deck, ...state.decks],
        }))
        return { success: true, message: 'Saved to Homebrew.' }
      },
      removeEvent(id) {
        if (id === 'untagged' || id === 'homebrew') {
          return { removedDecks: 0, removedEvent: false }
        }
        let removedDecks = 0
        set((state) => {
          const filteredDecks = state.decks.filter((deck) => {
            if (deck.eventId === id) {
              removedDecks += 1
              return false
            }
            return true
          })
          const filteredEvents = state.events.filter((evt) => evt.id !== id)
          return { decks: filteredDecks, events: filteredEvents }
        })
        return { removedDecks, removedEvent: true }
      },
      async addDeckFromImport(input, cards) {
        const eventId = input.eventId && input.eventId.trim().length ? input.eventId.trim() : undefined
        const event = eventId ? get().events.find((evt) => evt.id === eventId) : undefined

        if (!event) {
          return {
            success: false,
            message: 'Please select an event before importing a deck.',
            errors: [],
          }
        }

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
          eventId: event?.id,
          tournamentTag: input.tournamentTag?.trim() || event?.name,
          player: input.player?.trim(),
          ranking: input.ranking?.trim(),
          eventDate: input.eventDate || event?.date,
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
      hasImportedSource(source) {
        return get().importedSources.includes(source)
      },
      markImportedSource(source) {
        set((state) => ({
          importedSources: state.importedSources.includes(source)
            ? state.importedSources
            : [...state.importedSources, source],
        }))
      },
      clear() {
        set({ decks: [], importedSources: [] })
      },
    }),
    {
      name: 'deck-library',
    },
  ),
)
