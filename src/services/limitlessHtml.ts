export interface LimitlessDeckPayload {
  source: string
  eventName: string
  eventDate: string
  deckCount: number
  decks: {
    placing: string
    player: string
    deckName: string
    text: string
  }[]
}

function decodeHtml(str: string) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function toAscii(str: string) {
  return str
    .replace(/[–—]/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseMeta(html: string) {
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
  return { eventName: toAscii(eventName || 'Event'), eventDate }
}

interface DeckBlock {
  header: string
  body: string
}

function parseDeckBlocks(html: string): DeckBlock[] {
  const blocks: DeckBlock[] = []
  const regex =
    /<div class="decklist-toggle"[^>]*>([^<]+)<\/div>\s*<div class="hidden"[^>]*>\s*<div class="decklist"[^>]*>([\s\S]*?)<div class="decklist-extras">/g
  let match
  while ((match = regex.exec(html)) !== null) {
    blocks.push({ header: decodeHtml(match[1].trim()), body: match[2] })
  }
  return blocks
}

function categoriesToText(body: string) {
  const lines: string[] = []
  const headingRegex = /<div class="decklist-column-heading">\s*([^<]+)\s*<\/div>/g
  const headings = [...body.matchAll(headingRegex)]
  const extrasIndex = body.indexOf('<div class="decklist-extras">')

  headings.forEach((h, idx) => {
    const catName = toAscii(decodeHtml(h[1].trim()))
    const start = h.index + h[0].length
    const end =
      idx + 1 < headings.length
        ? headings[idx + 1].index
        : extrasIndex >= 0
          ? extrasIndex
          : body.length
    const segment = body.slice(start, end)

    const cards: { count: number; name: string; set: string; number: string }[] = []
    const cardBlockRegex = /<div class="decklist-card"[\s\S]*?<\/div>/g
    let cardBlock
    while ((cardBlock = cardBlockRegex.exec(segment)) !== null) {
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

    const total = cards.reduce((sum, c) => sum + (c.count || 0), 0)
    lines.push(`${catName}: ${total}`)
    cards.forEach((c) => {
      lines.push(`${c.count} ${c.name} ${c.set} ${c.number}`.trim())
    })
    lines.push('')
  })

  return lines.join('\n').trim()
}

function parseDeck(block: DeckBlock) {
  const deckTitleMatch = block.body.match(/decklist-title">\s*([^<]+)</)
  const placingPlayer = block.header ?? ''
  const deckName = deckTitleMatch ? toAscii(decodeHtml(deckTitleMatch[1].trim())) : ''

  let placing = ''
  let player = ''
  if (placingPlayer) {
    const parts = placingPlayer.split(/\s+/)
    placing = parts.shift() ?? ''
    player = parts.join(' ')
  }

  return {
    placing,
    player,
    deckName,
    text: categoriesToText(block.body),
  }
}

export function parseLimitlessHtml(html: string, source: string, top?: number): LimitlessDeckPayload {
  const meta = parseMeta(html)
  const blocks = parseDeckBlocks(html)
  const decks = blocks.map(parseDeck)
  const limited = typeof top === 'number' && top > 0 ? decks.slice(0, top) : decks

  return {
    source,
    eventName: meta.eventName,
    eventDate: meta.eventDate,
    deckCount: limited.length,
    decks: limited,
  }
}

export async function fetchLimitlessDecks(url: string, top?: number): Promise<LimitlessDeckPayload> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const html = await res.text()
  return parseLimitlessHtml(html, url, top)
}
