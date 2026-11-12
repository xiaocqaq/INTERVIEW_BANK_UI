import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) })
const errors = [], badAssets = [], checks = []
const folder = new URL('../docs/screenshots/', import.meta.url).pathname
await mkdir(folder, { recursive: true })
try {
  for (const width of [1440, 1024, 430]) {
    const context = await browser.newContext({ viewport: { width, height: width === 430 ? 820 : 900 } })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    page.on('response', r => { if (r.url().startsWith(base + '/static/') && r.status() >= 400) badAssets.push([r.status(), r.url()]) })
    const go = async path => { await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await page.locator('[data-home-view], [data-list-mode], [data-detail-id], [data-login-empty]').first().waitFor({ timeout: 20000 }).catch(async () => { await page.locator('#view-container h1').waitFor() }) }
    const shot = name => page.screenshot({ path: folder + name })
    await go('/')
    await page.locator('[data-hero-primary]').waitFor()
    assert.equal(await page.locator('#nav-all-count').innerText(), '510')
    if (width === 1440) await shot('02-home-desktop.png')
    if (width === 430) await shot('07-home-mobile.png')
    await go('/list?page=3')
    await page.locator('[data-question-id]').first().waitFor()
    assert.equal(await page.locator('[data-question-id]').count(), 10)
    assert.equal(await page.locator('[data-question-id]').first().getAttribute('data-question-id'), '21')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('[data-question-id]').first().waitFor()
    assert.equal(await page.locator('[data-question-id]').first().getAttribute('data-question-id'), '21')
    if (width === 1440) { await shot('03-list-pagination.png'); await page.locator('#main-scroll-container').evaluate(el => { el.scrollTop = el.scrollHeight }); await shot('04-list-pager-bottom.png') }
    await go('/list?q=jvm'); await page.locator('[data-question-id]').first().waitFor()
    if (width === 1440) await shot('05-list-search.png')
    await go('/q/60'); await page.locator('[data-detail-id="60"]').waitFor()
    await page.getByRole('button', { name: /查看答案/ }).click()
    await page.locator('.answer-prose').first().waitFor()
    await page.locator('#answer-content').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
    assert.equal(await page.locator('[data-sbactive]').count(), 24)
    if (width === 1440) {
      await page.locator('[data-sbactive]').first().evaluate(el => { window.retainedRow = el })
      await shot('01-detail-desktop.png')
      await page.locator('#theme-btn-dark').click(); await shot('06-detail-dark.png'); await page.locator('#theme-btn-light').click()
    }
    if (width === 430) {
      await shot('08-detail-mobile.png')
      await page.locator('#btn-mobile-menu').click()
      await page.locator('#app-sidebar[aria-modal=true]').waitFor()
      await page.locator('#app-sidebar').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
      await shot('09-sidebar-mobile.png')
      const covered = await page.locator('#app-sidebar').evaluate(el => el.contains(document.elementFromPoint(70, 170)))
      assert.ok(covered)
      await page.keyboard.press('Escape')
    }
    await page.locator('#main-scroll-container').evaluate(el => { el.scrollTop = 500 })
    await page.getByRole('button', { name: '下一题 →', exact: true }).click()
    await page.locator('[data-detail-id="61"]').waitFor()
    await page.waitForFunction(() => !document.getElementById('app-header').classList.contains('header-hidden'))
    if (width === 1440) assert.ok(await page.evaluate(() => window.retainedRow.isConnected))
    await go('/')
    assert.match(await page.locator('[data-hero-primary]').innerText(), /继续学习/)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('[data-hero-primary]').click()
    await page.locator('[data-detail-id="61"]').waitFor()
    await go('/q/584')
    await page.getByRole('button', { name: /下一小节/ }).click()
    await page.locator('[data-detail-id="2101"]').waitFor()
    assert.equal(await page.locator('[data-sbactive]').count(), 16)
    for (const path of ['/favorites', '/wrongbook']) { await go(path); assert.match(await page.locator('#view-container').innerText(), /登录/) }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    checks.push({ width, routes: 8, total: 510, pageSize: 10, resume: 61, nextSection: 2101 })
    await context.close()
  }
  assert.deepEqual(errors, []); assert.deepEqual(badAssets, [])
  console.log(JSON.stringify({ base, checks, errors, badAssets }, null, 2))
} finally { await browser.close() }
