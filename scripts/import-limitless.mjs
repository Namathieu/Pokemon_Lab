import fs from 'fs'
import path from 'path'

const API_BASE = 'https://play.limitlesstcg.com/api'
const ACCESS_KEY = process.env.LIMITLESS_KEY

if (!ACCESS_KEY) {
  console.error('Missing LIMITLESS_KEY env. Set it before running.')
  process.exit(1)
}

const tournamentUrl = process.argv[2]
const limitArg = process.argv[3]
const TOP_N = limitArg ? Number(limitArg) : 3

if (!tournamentUrl) {
  console.error('Usage: node scripts/import-limitless.mjs <tournament_url> [topN]')
  process.exit(1)
}

function extractTournamentId(url) {
  const match = url.match(/tournaments\/([^/]+)/)
  return match ? match[1] : null
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'X-Access-Key': ACCESS_KEY,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} for ${url}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

function toDeckText(decklist) {
  // decklist is expected to be a map: { category: [{name, count, set, number}, ...] }
  const lines = []
  const categories = ['pokemon', 'trainer', 'energy']
  categories.forEach((cat) => {
    const entries = decklist?.[cat] ?? []
    if (!entries.length) return
    const header = cat === 'pokemon' ? 'Pokemon' : cat[0].toUpperCase() + cat.slice(1)
    lines.push(`${header}: ${entries.reduce((s, e) => s + Number(e.count || 0), 0)}`)
    entries.forEach((entry) => {
      lines.push(`${entry.count} ${entry.name} ${entry.set ?? ''} ${entry.number ?? ''}`.trim())
    })
    lines.push('')
  })
  return lines.join('\n').trim()
}

async function main() {
  const tid = extractTournamentId(tournamentUrl)
  if (!tid) {
    console.error('Unable to extract tournament id from URL')
    process.exit(1)
  }

  console.log(`Fetching standings for tournament ${tid} (top ${TOP_N})`)
  const standingsUrl = `${API_BASE}/tournaments/${tid}/standings`
  const detailsUrl = `${API_BASE}/tournaments/${tid}/details`

  const [standings, details] = await Promise.all([
    fetchJson(standingsUrl),
    fetchJson(detailsUrl).catch(() => null),
  ])

  const eventName = details?.name ?? tid
  const eventDate = details?.date ?? null

  const decks = standings
    .filter((entry) => entry.decklist)
    .sort((a, b) => a.placing - b.placing)
    .slice(0, TOP_N)
    .map((entry) => {
      return {
        player: entry.name ?? entry.player,
        placing: entry.placing,
        deckText: toDeckText(entry.decklist),
      }
    })

  const output = {
    tournamentId: tid,
    eventName,
    eventDate,
    fetchedAt: new Date().toISOString(),
    decks,
  }

  const outPath = path.resolve(`limitless-${tid}-top${TOP_N}.json`)
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`Saved ${decks.length} decks to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
