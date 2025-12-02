import fs from 'fs'
import path from 'path'

const DATA_PATH = path.resolve('public/data/standard-cards.json')
const OUTPUT_SMALL = path.resolve('public/cards/small')
const OUTPUT_LARGE = path.resolve('public/cards/large')
const CONCURRENCY = 10

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function downloadImage(url, dest) {
  if (!url) return false
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return false
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
  return true
}

async function run() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Card dataset not found at ${DATA_PATH}. Run "npm run sync:cards" first.`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  const cards = Array.isArray(data.cards) ? data.cards : data
  ensureDir(OUTPUT_SMALL)
  ensureDir(OUTPUT_LARGE)

  let downloaded = 0
  let skipped = 0
  const tasks = cards.map((card) => async () => {
    const smallOut = path.join(OUTPUT_SMALL, `${card.id}.jpg`)
    const largeOut = path.join(OUTPUT_LARGE, `${card.id}.jpg`)
    try {
      const didSmall = await downloadImage(card.images?.small, smallOut)
      const didLarge = await downloadImage(card.images?.large, largeOut)
      if (didSmall || didLarge) {
        downloaded += Number(didSmall) + Number(didLarge)
      } else {
        skipped += 1
      }
    } catch (err) {
      console.warn(`Error for ${card.id}: ${err.message}`)
      await sleep(200)
    }
  })

  // simple concurrency runner
  let index = 0
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (index < tasks.length) {
      const task = tasks[index]
      index += 1
      await task()
    }
  })

  await Promise.all(workers)
  console.log(`Images downloaded: ${downloaded}, skipped (already present): ${skipped}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
