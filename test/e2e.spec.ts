import path from 'node:path'
import {
  type ElectronApplication,
  type Page,
  type JSHandle,
  _electron as electron,
} from 'playwright'
import type { BrowserWindow } from 'electron'
import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest'

const root = path.join(__dirname, '..')
let electronApp: ElectronApplication
let page: Page

if (process.platform === 'linux') {
  // pass ubuntu
  test(() => expect(true).true)
} else {
  beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox'],
      cwd: root,
      env: { ...process.env, NODE_ENV: 'development' },
    })
    page = await electronApp.firstWindow()

    const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
    await mainWin.evaluate(async (win) => {
      win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
    })
  })

  afterAll(async () => {
    await page.screenshot({ path: 'test/screenshots/e2e.png' })
    await page.close()
    await electronApp.close()
  })

  describe('[electron-vite-react] e2e tests', async () => {
    test('startup', async () => {
      const heading = (await page.textContent('h1'))?.trim()
      expect(heading).eq('Standard Deck Architect')
    })

    test('allows renaming the deck inline', async () => {
      const deckInput = page.locator('section:has-text("Your Deck") input').first()
      await deckInput.fill('Codex E2E Deck')
      const value = await deckInput.inputValue()
      expect(value).eq('Codex E2E Deck')
    })

    test('reset button clears card name filter', async () => {
      const searchInput = page.locator('label:has-text("Card Name") input').first()
      await searchInput.fill('pikachu')
      expect(await searchInput.inputValue()).eq('pikachu')

      const resetButton = page.locator('button:has-text("Reset")').first()
      await resetButton.click()

      const clearedValue = await searchInput.inputValue()
      expect(clearedValue).eq('')
    })
  })
}
