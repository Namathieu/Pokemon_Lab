import fs from 'fs'
import path from 'path'

const IMPORT_DIR = path.resolve('imports/limitless')
const OUTPUT_FILE = path.resolve('public/data/ai-stats.json')

function listDeckFiles() {
  if (!fs.existsSync(IMPORT_DIR)) return []
  return fs
    .readdirSync(IMPORT_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(IMPORT_DIR, file))
}

function parseLine(line) {
  const sanitized = line.replace(/\u00A0/g, ' ').trim()
  if (!sanitized) return null
  if (/^(#|\/\/|\*)/.test(sanitized)) return null
  if (sanitized.startsWith('[') && sanitized.endsWith(']')) return null
  if (/^\d+\s+x/i.test(sanitized)) {
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

function parseDeckText(text) {
  const lines = text.split(/\r?\n/)
  const entries = []
  for (const line of lines) {
    const parsed = parseLine(line)
    if (parsed) entries.push(parsed)
  }
  return entries
}

function accumulateStats(decks) {
  const cardUsage = {}
  const pairUsage = {}

  decks.forEach((deck) => {
    const seenIds = new Set()
    const entries = parseDeckText(deck.text ?? '')
    const idList = []
    entries.forEach((entry) => {
      const id = `${entry.name}::${entry.setCode}::${entry.cardNumber}`
      if (!cardUsage[id]) {
        cardUsage[id] = {
          id,
          name: entry.name,
          set: entry.setCode,
          number: entry.cardNumber,
          deck_count: 0,
          total_copies: 0,
        }
      }
      cardUsage[id].total_copies += entry.count
      if (!seenIds.has(id)) {
        seenIds.add(id)
        cardUsage[id].deck_count += 1
      }
      idList.push(id)
    })
    const uniqueIds = Array.from(new Set(idList)).sort()
    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = i + 1; j < uniqueIds.length; j++) {
        const key = `${uniqueIds[i]}__${uniqueIds[j]}`
        pairUsage[key] = (pairUsage[key] ?? 0) + 1
      }
    }
  })

  return { cardUsage, pairUsage }
}

function main() {
  const files = listDeckFiles()
  if (!files.length) {
    console.error('No imports found in imports/limitless')
    process.exit(1)
  }

  let decks = []
  files.forEach((file) => {
    try {
      const payload = JSON.parse(fs.readFileSync(file, 'utf-8'))
      if (Array.isArray(payload.decks)) {
        decks = decks.concat(
          payload.decks.map((d) => ({
            text: d.text ?? '',
            deckName: d.deckName ?? '',
            player: d.player ?? '',
            placing: d.placing ?? '',
            eventName: payload.eventName ?? '',
            eventDate: payload.eventDate ?? '',
            source: payload.source ?? file,
          })),
        )
      }
    } catch (error) {
      console.error(`Failed to read ${file}:`, error.message)
    }
  })

  if (!decks.length) {
    console.error('No decks parsed.')
    process.exit(1)
  }

  const { cardUsage, pairUsage } = accumulateStats(decks)
  const output = {
    generatedAt: new Date().toISOString(),
    deckCount: decks.length,
    cardUsage,
    pairUsage,
  }

  const outDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Wrote stats for ${decks.length} decks to ${OUTPUT_FILE}`)
}

main()
