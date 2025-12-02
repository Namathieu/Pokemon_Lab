import type { DeckEntry } from '@/types/pokemon'
import { isStandardCard } from './cardRules'

const MAX_DECK_SIZE = 60

const SECTION_ORDER = [
  {
    label: 'Pokemon',
    matches: (supertype?: string) => supertype?.toLowerCase().startsWith('pok'),
  },
  {
    label: 'Trainer',
    matches: (supertype?: string) => supertype?.toLowerCase() === 'trainer',
  },
  {
    label: 'Energy',
    matches: (supertype?: string) => supertype?.toLowerCase() === 'energy',
  },
]

const FALLBACK_SECTION = 'Other'

function getSetIdentifier(entry: DeckEntry) {
  const code = entry.card.set?.ptcgoCode ?? entry.card.set?.id ?? 'UNK'
  return code.toUpperCase()
}

function groupEntries(entries: DeckEntry[]) {
  const sections: Record<
    string,
    {
      label: string
      entries: DeckEntry[]
    }
  > = {}

  SECTION_ORDER.forEach(({ label }) => {
    sections[label] = { label, entries: [] }
  })
  sections[FALLBACK_SECTION] = { label: FALLBACK_SECTION, entries: [] }

  entries.forEach((entry) => {
    const match = SECTION_ORDER.find(({ matches }) => matches(entry.card.supertype))
    const key = match?.label ?? FALLBACK_SECTION
    sections[key].entries.push(entry)
  })

  return SECTION_ORDER.map(({ label }) => sections[label]).concat(sections[FALLBACK_SECTION])
}

export function formatDeckAsText(deckName: string, entries: DeckEntry[]) {
  const lines: string[] = []
  lines.push(`Deck: ${deckName}`)
  lines.push('')

  const sections = groupEntries(entries)
  sections.forEach((section) => {
    if (section.entries.length === 0) return
    const total = section.entries.reduce((sum, entry) => sum + entry.count, 0)
    lines.push(`${section.label}: ${total}`)
    section.entries.forEach((entry) => {
      lines.push(`${entry.count} ${entry.card.name} ${getSetIdentifier(entry)} ${entry.card.number}`)
    })
    lines.push('')
  })

  const totalCards = entries.reduce((sum, entry) => sum + entry.count, 0)
  lines.push(`Total Cards: ${totalCards}/${MAX_DECK_SIZE}`)
  return lines.join('\n').trim()
}

export interface DeckStats {
  total: number
  remaining: number
  countsBySupertype: Record<string, number>
  standardLegal: boolean
}

export function computeDeckStats(entries: DeckEntry[]): DeckStats {
  const countsBySupertype: Record<string, number> = {}
  let total = 0
  let standardLegal = true

  entries.forEach((entry) => {
    const key = entry.card.supertype ?? 'Other'
    countsBySupertype[key] = (countsBySupertype[key] ?? 0) + entry.count
    total += entry.count
    if (standardLegal && !isStandardCard(entry.card)) {
      standardLegal = false
    }
  })

  return {
    total,
    remaining: Math.max(0, MAX_DECK_SIZE - total),
    countsBySupertype,
    standardLegal,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildPrintableDeckHtml(deckName: string, entries: DeckEntry[]) {
  const sections = groupEntries(entries).filter((section) => section.entries.length > 0)
  const totalCards = entries.reduce((sum, entry) => sum + entry.count, 0)
  const safeDeckName = escapeHtml(deckName || 'Deck')

  const metaBlock = `<div class="meta-grid">
    <div class="format">
      <span class="label">Format:</span>
      <label><span class="box"></span>Standard</label>
      <label><span class="box"></span>Expanded</label>
      <label><span class="box"></span>Other</label>
    </div>
    <div class="field"><span class="label">Player name:</span><span class="line"></span></div>
    <div class="field"><span class="label">Player ID:</span><span class="line short"></span></div>
    <div class="field"><span class="label">Birth date:</span><span class="line short"></span></div>
  </div>`

  const sectionMarkup = sections
    .map((section) => {
      const rows = section.entries
        .map((entry) => {
          const name = escapeHtml(entry.card.name)
          const meta = `${getSetIdentifier(entry)} ${entry.card.number ?? ''}`.trim()
          return `<tr><td class="count">${entry.count}x</td><td class="name">${name}</td><td class="meta">${meta}</td></tr>`
        })
        .join('')
      return `<section><h2>${section.label} (${section.entries.reduce((sum, entry) => sum + entry.count, 0)})</h2><table>${rows}</table></section>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeDeckName} - Decklist</title>
  <style>
    :root {
      color: #0f172a;
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      padding: 32px;
      background: #f8fafc;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px 16px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      margin-bottom: 16px;
    }
    .format {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      font-size: 13px;
      color: #0f172a;
    }
    .format .label {
      font-weight: 600;
    }
    .format label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .format .box {
      width: 14px;
      height: 14px;
      border: 1.5px solid #334155;
      border-radius: 3px;
      display: inline-block;
    }
    .field {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #0f172a;
      flex-wrap: nowrap;
    }
    .field .label {
      font-weight: 600;
      white-space: nowrap;
    }
    .line {
      flex: 1;
      border-bottom: 1px solid #cbd5e1;
      height: 14px;
    }
    .line.short {
      max-width: 160px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      color: #0f172a;
    }
    .summary {
      font-size: 14px;
      color: #334155;
    }
    section {
      margin-bottom: 20px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 6px 4px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    td.count {
      width: 60px;
      font-weight: 700;
      color: #0f172a;
    }
    td.name {
      width: 100%;
    }
    td.meta {
      white-space: nowrap;
      color: #475569;
      font-variant-numeric: tabular-nums;
    }
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
      body {
        padding: 0;
        background: white;
      }
      .page {
        box-shadow: none;
        border: none;
        padding: 12px 18px;
        width: 100%;
        transform: scale(0.95);
        transform-origin: top left;
      }
      header {
        border-bottom: 1px solid #cbd5e1;
        margin-bottom: 12px;
      }
      section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div>
        <div class="summary">Pokemon TCG Decklist</div>
        <h1>${safeDeckName}</h1>
      </div>
      <div class="summary">Total: ${totalCards} / ${MAX_DECK_SIZE}</div>
    </header>
    ${sectionMarkup || '<p class="summary">No cards in deck.</p>'}
  </div>
</body>
</html>`
}
