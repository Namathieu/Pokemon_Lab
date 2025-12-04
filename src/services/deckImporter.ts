import type { DeckEntry, PokemonCard } from '@/types/pokemon'

interface ParsedLine {
  count: number
  name: string
  setCode: string
  cardNumber: string
}

export interface DeckImportResult {
  entries: DeckEntry[]
  errors: string[]
  deckName?: string
}

function normalizeLine(rawLine: string) {
  return rawLine.replace(/\u00A0/g, ' ').trim()
}

function extractDeckName(text: string) {
  const titleMatch = text.match(/^(?:deck|title)\s*[:\-]\s*(.+)$/im)
  return titleMatch ? titleMatch[1].trim() : undefined
}

function parseLine(line: string): ParsedLine | null {
  const sanitized = normalizeLine(line)
  if (!sanitized.length) return null
  if (/^(#|\/\/|\*)/.test(sanitized)) return null
  if (sanitized.startsWith('[') && sanitized.endsWith(']')) return null
  if (/^\d+\s+x/i.test(sanitized)) {
    // handle formats like "4 x Pikachu VIV 44"
    return parseLine(sanitized.replace(/\s*x\s*/i, ' '))
  }

  const tokens = sanitized.split(/\s+/)
  if (tokens.length < 4) return null

  const maybeCount = Number(tokens[0])
  if (!Number.isFinite(maybeCount) || maybeCount <= 0) return null

  const cardNumber = tokens[tokens.length - 1]
  const setCode = tokens[tokens.length - 2]
  const nameTokens = tokens.slice(1, -2)
  if (!nameTokens.length) return null

  return {
    count: maybeCount,
    name: nameTokens.join(' '),
    setCode,
    cardNumber,
  }
}

export function parseDeckText(text: string) {
  const entries: ParsedLine[] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const parsed = parseLine(line)
    if (parsed) entries.push(parsed)
  }

  return {
    lines: entries,
    deckName: extractDeckName(text),
  }
}

function matchSet(card: PokemonCard, setCode: string) {
  const target = setCode.toLowerCase()
  const idMatches = card.set?.id?.toLowerCase() === target
  const ptcgoMatches = card.set?.ptcgoCode?.toLowerCase() === target
  return idMatches || ptcgoMatches
}

function findCard(cards: PokemonCard[], setCode: string, cardNumber: string) {
  const normalizedNumber = cardNumber.trim().toLowerCase()
  return cards.find(
    (card) =>
      matchSet(card, setCode) && card.number?.trim().toLowerCase() === normalizedNumber,
  )
}

function isBasicEnergy(card: PokemonCard) {
  return (
    card.supertype?.toLowerCase() === 'energy' &&
    (card.subtypes ?? []).some((subtype) => subtype.toLowerCase() === 'basic')
  )
}

function findBasicEnergyFallback(cards: PokemonCard[], name: string) {
  // Try to infer energy type from names like "Fighting Energy", "Water Basic Energy", etc.
  const match = name.match(/^([\w-]+)\s+energy/i)
  const energyType = match?.[1]?.toLowerCase()
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ')

  return cards.find((card) => {
    if (!isBasicEnergy(card)) return false
    const types = (card.types ?? []).map((type) => type.toLowerCase())
    const nameMatches = card.name?.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedName
    const typeMatches = energyType ? types.includes(energyType) : false
    return nameMatches || typeMatches
  })
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function findByName(cards: PokemonCard[], name: string) {
  const target = normalizeName(name)
  const exact = cards.find((card) => normalizeName(card.name ?? '') === target)
  if (exact) return exact
  // loose contains match as a fallback
  return cards.find((card) => normalizeName(card.name ?? '').includes(target))
}

function findByBaseName(cards: PokemonCard[], name: string) {
  const base = normalizeName(name).replace(/\b(ex|vstar|vmax|v-union|v|gx|ex)\b/g, '').trim()
  if (!base) return undefined
  return cards.find((card) => {
    const cardBase = normalizeName(card.name ?? '').replace(
      /\b(ex|vstar|vmax|v-union|v|gx|ex)\b/g,
      '',
    ).trim()
    return cardBase === base
  })
}

export async function importDeckFromText(
  text: string,
  options: { cards: PokemonCard[] },
): Promise<DeckImportResult> {
  const { lines, deckName } = parseDeckText(text)
  const errors: string[] = []
  const map = new Map<string, DeckEntry>()

  for (const line of lines) {
    try {
      let card =
        findCard(options.cards, line.setCode, line.cardNumber) ??
        findBasicEnergyFallback(options.cards, line.name) ??
        findByName(options.cards, line.name) ??
        findByBaseName(options.cards, line.name)

      if (!card) {
        errors.push(`No match for ${line.count}x ${line.name} (${line.setCode} ${line.cardNumber})`)
        continue
      }

      const existing = map.get(card.id)
      if (existing) {
        existing.count += line.count
      } else {
        map.set(card.id, { card, count: line.count })
      }
    } catch (error) {
      errors.push(
        `Failed to process ${line.count}x ${line.name} (${line.setCode} ${line.cardNumber}): ${
          (error as Error).message
        }`,
      )
    }
  }

  return {
    entries: Array.from(map.values()),
    errors,
    deckName,
  }
}
