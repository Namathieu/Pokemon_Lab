import fs from 'fs'
import path from 'path'

const url = process.argv[2]
const topArg = process.argv[3]
const TOP = topArg ? Number(topArg) : null
const OUTPUT_DIR = path.resolve('imports/limitless')

if (!url) {
  console.error('Usage: node scripts/import-limitless-html.mjs <decklists_url> [topN]')
  process.exit(1)
}

async function fetchHtml(target) {
  // Allow local files for offline testing
  if (!/^https?:/i.test(target) && fs.existsSync(target)) {
    return fs.readFileSync(target, 'utf8')
  }
  const res = await fetch(target)
  if (!res.ok) throw new Error(`Failed to fetch ${target}: ${res.status}`)
  return res.text()
}

function parseMeta(html) {
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/i)
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  let eventName = titleMatch
    ? titleMatch[1].replace(/ ?[-–—] ?Decklists ?[-–—] ?Limitless/i, '').trim()
    : ''
  let eventDate = ''
  if (descMatch) {
    const parts = descMatch[1].split(' - ')
    if (parts.length >= 2) {
      eventDate = parts[0].trim()
      if (!eventName) eventName = parts[1].trim()
    }
  }
  return { eventName, eventDate }
}

function parseDeckBlocks(html) {
  const blocks = []
  // Capture toggle (placing + player) and decklist content
  const regex =
    /<div class="decklist-toggle"[^>]*>([^<]+)<\/div>\s*<div class="hidden"[^>]*>\s*<div class="decklist"[^>]*>([\s\S]*?)<div class="decklist-extras">/g
  let match
  while ((match = regex.exec(html)) !== null) {
    blocks.push({ header: decodeHtml(match[1].trim()), body: match[2] })
  }
  return blocks
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function parseDeck(block) {
  const toggleMatch = block.header
  const deckTitleMatch = block.body.match(/decklist-title">\s*([^<]+)</)
  const placingPlayer = toggleMatch ? toggleMatch : ''
  const deckName = deckTitleMatch ? decodeHtml(deckTitleMatch[1].trim()) : ''

  let placing = ''
  let player = ''
  if (placingPlayer) {
    const parts = placingPlayer.split(/\s+/)
    placing = parts.shift() ?? ''
    player = parts.join(' ')
  }

  const categories = []
  const headingRegex = /<div class="decklist-column-heading">\s*([^<]+)\s*<\/div>/g
  const headings = [...block.body.matchAll(headingRegex)]
  const extrasIndex = block.body.indexOf('<div class="decklist-extras">')

  headings.forEach((h, idx) => {
    const catName = toAscii(decodeHtml(h[1].trim()))
    const start = h.index + h[0].length
    const end =
      idx + 1 < headings.length
        ? headings[idx + 1].index
        : extrasIndex >= 0
          ? extrasIndex
          : block.body.length
    const body = block.body.slice(start, end)

    const cards = []
    const cardBlockRegex = /<div class="decklist-card"[\s\S]*?<\/div>/g
    let cardBlock
    while ((cardBlock = cardBlockRegex.exec(body)) !== null) {
      const blockHtml = cardBlock[0]
      const set = blockHtml.match(/data-set="([^"]*)"/i)?.[1] ?? ''
      const number = blockHtml.match(/data-number="([^"]*)"/i)?.[1] ?? ''
      const count = blockHtml.match(/<span class="card-count">([^<]+)<\/span>/i)?.[1]?.trim() ?? ''
      const name = blockHtml.match(/<span class="card-name">([^<]+)<\/span>/i)?.[1]?.trim() ?? ''
      if (!count || !name) continue
      cards.push({
        set: decodeHtml(set),
        number: decodeHtml(number),
        count: Number(count),
        name: toAscii(decodeHtml(name)),
      })
    }
    categories.push({ name: catName, cards })
  })

  return {
    placing,
    player,
    deckName,
    categories,
  }
}

function categoriesToText(categories) {
  const lines = []
  categories.forEach((cat) => {
    const total = cat.cards.reduce((sum, c) => sum + (c.count || 0), 0)
    lines.push(`${cat.name}: ${total}`)
    cat.cards.forEach((c) => {
      lines.push(`${c.count} ${c.name} ${c.set} ${c.number}`.trim())
    })
    lines.push('')
  })
  return lines.join('\n').trim()
}

function toAscii(str) {
  return str
    .replace(/[–—]/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

async function main() {
  const html = await fetchHtml(url)
  const meta = parseMeta(html)
  const blocks = parseDeckBlocks(html)
  const eventName = toAscii(meta.eventName || 'event')
  const eventDate = meta.eventDate

  const decks = blocks.map(parseDeck)
  const limitedDecks = TOP ? decks.slice(0, TOP) : decks

  const output = {
    source: url,
    eventName,
    eventDate,
    deckCount: limitedDecks.length,
    decks: limitedDecks.map((d, idx) => ({
      placing: d.placing,
      player: d.player,
      deckName: d.deckName || `Deck ${idx + 1}`,
      text: categoriesToText(d.categories),
    })),
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const filename = `limitless-html-${eventName.replace(/\s+/g, '_')}-${limitedDecks.length}.json`
  const outPath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Parsed ${limitedDecks.length} decks from HTML and saved to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
