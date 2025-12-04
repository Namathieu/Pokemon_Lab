import fs from 'fs'
import path from 'path'

const DATA_PATH = path.resolve('public/data/standard-cards.json')
const OUTPUT_SMALL = path.resolve('public/cards/small')
const OUTPUT_LARGE = path.resolve('public/cards/large')
const CONCURRENCY = 10

const sanitizeId = (id) => {
  const safe = String(id ?? '')
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
  return safe.length ? safe : 'unknown'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function downloadImage(url, dest) {
  if (!url) return { downloaded: false, skipped: true }
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return { downloaded: false, skipped: true }
  }
  const res = await fetch(url)
  if (res.status === 404) {
    return { downloaded: false, skipped: true, missing: true }
  }
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
  return { downloaded: true, skipped: false }
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
  let missing = 0
  const tasks = cards.map((card) => async () => {
    const safeId = sanitizeId(card.id)
    const smallOut = path.join(OUTPUT_SMALL, `${safeId}.jpg`)
    const largeOut = path.join(OUTPUT_LARGE, `${safeId}.jpg`)
    try {
      const resSmall = await downloadImage(card.images?.small, smallOut)
      const resLarge = await downloadImage(card.images?.large, largeOut)
      downloaded += Number(resSmall.downloaded ?? 0) + Number(resLarge.downloaded ?? 0)
      skipped += Number(resSmall.skipped ?? 0) + Number(resLarge.skipped ?? 0)
      missing += Number(resSmall.missing ?? 0) + Number(resLarge.missing ?? 0)
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
  console.log(
    `Images downloaded: ${downloaded}, skipped (already present or missing URL/404): ${skipped}, missing (404): ${missing}`,
  )
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
