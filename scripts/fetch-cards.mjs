#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const datasetRoot = path.join(projectRoot, 'pokemon-tcg-data-master')
const cardsDir = path.join(datasetRoot, 'cards', 'en')
const setsFile = path.join(datasetRoot, 'sets', 'en.json')
const outputDir = path.join(projectRoot, 'public', 'data')
const outputFile = path.join(outputDir, 'standard-cards.json')

async function ensurePathExists(target, message) {
  try {
    await fs.access(target)
  } catch {
    throw new Error(message)
  }
}

async function loadJSON(filePath) {
  const data = await fs.readFile(filePath, 'utf8')
  return JSON.parse(data)
}

function buildSetLookup(rawSets) {
  const map = new Map()
  for (const set of rawSets) {
    map.set(set.id.toLowerCase(), {
      id: set.id,
      name: set.name,
      series: set.series,
      ptcgoCode: set.ptcgoCode ?? '',
      releaseDate: set.releaseDate ?? '',
      images: set.images ?? {},
      legalities: set.legalities ?? {},
    })
  }
  return map
}

function resolveSet(cardId, setLookup) {
  const prefix = cardId.split('-')[0]?.toLowerCase() ?? ''
  const fallbackName = prefix ? prefix.toUpperCase() : 'Unknown'
  return (
    setLookup.get(prefix) ?? {
      id: prefix || 'unknown',
      name: fallbackName,
      series: 'Unknown',
      ptcgoCode: '',
      releaseDate: '',
      images: {},
      legalities: {},
    }
  )
}

async function collectCards(setLookup) {
  const entries = await fs.readdir(cardsDir)
  entries.sort()

  const collected = []

  for (const file of entries) {
    if (!file.endsWith('.json')) continue
    const fullPath = path.join(cardsDir, file)
    const data = await loadJSON(fullPath)
    for (const card of data) {
      collected.push({
        ...card,
        set: resolveSet(card.id, setLookup),
      })
    }
  }

  return collected
}

async function main() {
  await ensurePathExists(
    cardsDir,
    'Missing pokemon-tcg-data-master/cards/en directory. Drop the dataset into the project root before syncing.',
  )
  await ensurePathExists(
    setsFile,
    'Missing pokemon-tcg-data-master/sets/en.json file. Pull the dataset from github.com/PokemonTCG/pokemon-tcg-data.',
  )

  console.log('[pokedeck] Building card library from pokemon-tcg-data...')
  const rawSets = await loadJSON(setsFile)
  const setLookup = buildSetLookup(rawSets)
  const cards = await collectCards(setLookup)

  await fs.mkdir(outputDir, { recursive: true })
  const payload = {
    generatedAt: new Date().toISOString(),
    count: cards.length,
    cards,
  }
  await fs.writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`[pokedeck] Saved ${cards.length} cards to ${path.relative(projectRoot, outputFile)}`)
}

main().catch((error) => {
  console.error('[pokedeck] Failed to build local card library:', error)
  process.exitCode = 1
})
