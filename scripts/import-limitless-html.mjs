import fs from 'fs'
import path from 'path'

const url = process.argv[2]
const topArg = process.argv[3]
const TOP = topArg ? Number(topArg) : null

if (!url) {
  console.error('Usage: node scripts/import-limitless-html.mjs <decklists_url> [topN]')
  process.exit(1)
}

async function fetchHtml(target) {
  const res = await fetch(target)
  if (!res.ok) throw new Error(`Failed to fetch ${target}: ${res.status}`)
  return res.text()
}

function parseMeta(html) {
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/i)
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  let eventName = titleMatch ? titleMatch[1].replace(/ - Decklists - Limitless/i, '').trim() : ''
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
  const regex = /<div class="tournament-decklist">([\s\S]*?)<\/div>\s*<\/div>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    blocks.push(match[1])
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
  const toggleMatch = block.match(/decklist-toggle"[^>]*>([^<]+)</)
  const deckTitleMatch = block.match(/decklist-title">\s*([^<]+)</)
  const placingPlayer = toggleMatch ? decodeHtml(toggleMatch[1].trim()) : ''
  const deckName = deckTitleMatch ? decodeHtml(deckTitleMatch[1].trim()) : ''

  let placing = ''
  let player = ''
  if (placingPlayer) {
    const parts = placingPlayer.split(/\s+/)
    placing = parts.shift() ?? ''
    player = parts.join(' ')
  }

  const categories = []
  const colRegex =
    /decklist-column-heading">\s*([^<]+)\s*<\/div>\s*([\s\S]*?)(?=<div class="decklist-column-heading"|<div class="decklist-extras")/g
  let colMatch
  while ((colMatch = colRegex.exec(block)) !== null) {
    const catName = decodeHtml(colMatch[1].trim())
    const body = colMatch[2]
    const cards = []
    const cardRegex =
      /<div class="decklist-card"[^>]*data-set="([^"]+)"[^>]*data-number="([^"]+)"[^>]*>[\s\S]*?<span class="card-count">([^<]+)<\/span>\s*<span class="card-name">([^<]+)<\/span>/g
    let cardMatch
    while ((cardMatch = cardRegex.exec(body)) !== null) {
      cards.push({
        set: decodeHtml(cardMatch[1]),
        number: decodeHtml(cardMatch[2]),
        count: Number(cardMatch[3].trim()),
        name: decodeHtml(cardMatch[4].trim()),
      })
    }
    categories.push({ name: catName, cards })
  }

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

async function main() {
  const html = await fetchHtml(url)
  const meta = parseMeta(html)
  const blocks = parseDeckBlocks(html)

  const decks = blocks.map(parseDeck)
  const limitedDecks = TOP ? decks.slice(0, TOP) : decks

  const output = {
    source: url,
    eventName: meta.eventName,
    eventDate: meta.eventDate,
    deckCount: limitedDecks.length,
    decks: limitedDecks.map((d, idx) => ({
      placing: d.placing,
      player: d.player,
      deckName: d.deckName || `Deck ${idx + 1}`,
      text: categoriesToText(d.categories),
    })),
  }

  const outPath = path.resolve(
    `limitless-html-${meta.eventName || 'event'}-${limitedDecks.length}.json`.replace(/\s+/g, '_'),
  )
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Parsed ${limitedDecks.length} decks from HTML and saved to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
