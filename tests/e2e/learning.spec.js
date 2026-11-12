import { test, expect } from '@playwright/test'

const categories = [
  { lang: 'java', slug: 'basics', name: 'Java 基础', count: 25 },
  { lang: 'java', slug: 'jvm', name: 'JVM', count: 14 },
  { lang: 'python', slug: 'web', name: 'Web 框架', count: 1 },
  { lang: 'llm', slug: 'deepagent', name: 'DeepAgent 智能体', count: 1 },
]
const makeQuestion = (id, lang, category) => ({ id, lang, category, title: '测试题 ' + id + (category === 'jvm' ? ' JVM' : ''), difficulty: id % 3 + 1, tags: ['回归测试'], favorite: false, last_status: null, in_wrong_book: false })
const initialQuestions = [...Array.from({ length: 25 }, (_, i) => makeQuestion(i + 1, 'java', 'basics')),
  ...Array.from({ length: 14 }, (_, i) => makeQuestion(i + 57, 'java', 'jvm')),
  makeQuestion(166, 'python', 'web'), makeQuestion(990, 'llm', 'deepagent')]
const answer = id => '<h2>核心答案</h2><p>核心 ' + id + '</p><h2>深入解析</h2><table><tr><th>概念</th><th>说明</th></tr><tr><td>Vue</td><td>响应式</td></tr></table><h2>常见追问</h2><ul><li>如何避免整页刷新？</li></ul><h2>代码示例</h2><p>示例说明</p><div class="codehilite"><pre><code>print(' + id + ')</code></pre></div>'
async function mockApi(page, authenticated = false) {
  const questions = structuredClone(initialQuestions)
  const calls = []
  if (authenticated) await page.addInitScript(() => localStorage.setItem('mianshi_token', 'test-only-token'))
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    const headers = { 'content-type': 'application/json' }
    let data
    if (path === '/api/categories') data = { categories }
    else if (path === '/api/auth/me') data = { user: { username: 'test-user', display_name: '测试用户' } }
    else if (path === '/api/auth/login') data = { token: 'test-only-token', user: { username: 'test-user', display_name: '测试用户' } }
    else if (path === '/api/questions') { const p = Number(url.searchParams.get('page') || 1); data = { total: questions.length, items: p === 1 ? questions : [] } }
    else {
      const match = path.match(/^\/api\/questions\/(\d+)(?:\/(favorite|record))?$/)
      if (!match) return route.fulfill({ status: 404, headers, body: '{}' })
      const q = questions.find(q => q.id === Number(match[1]))
      if (!q) return route.fulfill({ status: 404, headers, body: '{"detail":"题目不存在"}' })
      if (match[2]) {
        calls.push({ path, method: req.method(), body: req.postDataJSON() })
        if (match[2] === 'favorite') { q.favorite = !q.favorite; data = { ok: true, favorite: q.favorite } }
        else { q.last_status = req.postDataJSON().status; q.in_wrong_book = q.last_status === 2 || q.last_status === 3; data = { ok: true } }
      } else data = { ...q, answer_html: answer(q.id) }
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify(data) })
  })
  return { questions, calls }
}
async function visit(page, path) { await page.goto(path, { waitUntil: 'domcontentloaded' }); await expect(page.locator('#nav-all-count')).toHaveText('41') }
async function sidebar(page, isMobile) {
  if (!isMobile) return
  if (await page.locator('#app-header').evaluate(el => el.classList.contains('header-hidden'))) {
    await page.locator('#main-scroll-container').hover()
    await page.mouse.wheel(0, -100)
  }
  await page.locator('#btn-mobile-menu').click()
}
test.beforeEach(async ({ page }) => {
  // Optional cross-site theme sync must not make fixture navigation depend on the network.
  await page.route('https://mxiao.top/assets/theme-sync.js*', route => route.fulfill({ contentType: 'application/javascript', body: '' }))
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|fonts.googleapis/.test(message.text())) errors.push(message.text()) })
  page.__errors = errors
})
test.afterEach(async ({ page }) => { expect(page.__errors).toEqual([]) })

test('home resume survives refresh and previous/next navigation', async ({ page, isMobile }) => {
  await mockApi(page)
  await visit(page, '/')
  await expect(page.locator('[data-hero-primary]')).toHaveText(/开始学习/)
  await page.goto('/q/60')
  await expect(page.locator('[data-detail-id="60"]')).toBeVisible()
  await page.getByRole('button', { name: '下一题 →', exact: true }).click()
  await expect(page).toHaveURL(/\/q\/61$/)
  await page.getByRole('button', { name: '← 上一题', exact: true }).click()
  await expect(page).toHaveURL(/\/q\/60$/)
  await sidebar(page, isMobile)
  await page.locator('#nav-home').click()
  await expect(page.locator('[data-hero-primary]')).toHaveText(/继续学习/)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('[data-hero-primary]').click()
  await expect(page).toHaveURL(/\/q\/60$/)
})

test('question navigation keeps header collapsed through scroll reset and upward input reveals it', async ({ page }) => {
  await mockApi(page)
  await visit(page, '/q/60')
  const header = page.locator('#app-header')
  await expect(header).not.toHaveClass(/header-hidden/)
  await page.getByRole('button', { name: '下一题 →', exact: true }).click()
  await expect(page).toHaveURL(/\/q\/61$/)
  await expect(header).toHaveClass(/header-hidden/)
  await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBe(0)
  await expect.poll(() => page.locator('#main-scroll-container').evaluate(el => el.scrollTop)).toBe(0)
  await page.getByRole('button', { name: '← 上一题', exact: true }).click()
  await expect(page).toHaveURL(/\/q\/60$/)
  await expect(header).toHaveClass(/header-hidden/)
  await page.locator('#main-scroll-container').hover(); await page.mouse.wheel(0, -100)
  await expect(header).not.toHaveClass(/header-hidden/)
  await page.getByRole('button', { name: /查看答案/ }).click()
  await page.locator('#main-scroll-container').evaluate(el => { el.scrollTop = el.scrollHeight })
  await page.getByRole('button', { name: '下一题 →', exact: true }).click()
  await expect(page).toHaveURL(/\/q\/61$/)
  await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBe(0)
  await page.locator('#detail-navbar a').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(header).not.toHaveClass(/header-hidden/)
})

test('legacy hash detail links normalize before router initialization', async ({ page }) => {
  await mockApi(page)
  await page.goto('/#/q/60')
  await expect(page).toHaveURL(/\/q\/60$/)
  await expect(page.locator('[data-detail-id="60"]')).toBeVisible()
})

test('list has ten items, persists page, clamps invalid deep links', async ({ page }) => {
  await mockApi(page)
  await visit(page, '/list')
  await expect(page.locator('[data-question-id]')).toHaveCount(10)
  await expect(page.getByRole('button', { name: '上一页', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('[data-question-id]').first()).toHaveAttribute('data-question-id', '11')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-question-id]').first()).toHaveAttribute('data-question-id', '11')
  await page.goto('/list?page=999')
  await expect(page).toHaveURL(/page=5/)
  await expect(page.getByRole('button', { name: '下一页', exact: true })).toBeDisabled()
  await page.goto('/list?page=abc')
  await expect(page).toHaveURL(/\/list$/)
  await expect(page.locator('[data-question-id]')).toHaveCount(10)
})

test('pagination starts at the new first question without header or row jitter', async ({ page }) => {
  await mockApi(page)
  await visit(page, '/list')
  await page.evaluate(() => document.fonts.ready)
  const header = page.locator('#app-header')
  const first = page.locator('[data-question-id]').first()
  const checkPage = async (control, id, expectedPage) => {
    // Use a real downward scroll, rather than scrollIntoView's nearest-edge direction.
    await page.locator('#main-scroll-container').evaluate(el => { el.scrollTop = 0 })
    await page.locator('#main-scroll-container').hover()
    await page.mouse.wheel(0, -100)
    await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBe(64)
    await page.locator('#main-scroll-container').evaluate(el => { el.scrollTop = el.scrollHeight })
    await expect.poll(() => header.evaluate(el => el.getBoundingClientRect().height)).toBe(0)
    await page.locator('[data-question-list]').evaluate(el => {
      window.pageFrameSamples = []
      const observer = new MutationObserver(() => {
        const row = el.querySelector('[data-question-id]')
        if (!row || row.dataset.questionId === window.pageOldFirst) return
        observer.disconnect()
        let frames = 0
        const sample = () => {
          const scroller = document.getElementById('main-scroll-container')
          window.pageFrameSamples.push({
            id: row.dataset.questionId,
            header: document.getElementById('app-header').getBoundingClientRect().height,
            top: row.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
          })
          if (++frames < 24) requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      window.pageOldFirst = el.querySelector('[data-question-id]').dataset.questionId
      observer.observe(el, { childList: true, subtree: true })
    })
    await control.click()
    await expect(first).toHaveAttribute('data-question-id', String(id))
    await expect.poll(() => page.evaluate(() => window.pageFrameSamples.length)).toBeGreaterThanOrEqual(5)
    const frames = await page.evaluate(() => window.pageFrameSamples)
    expect(frames.every(frame => frame.id === String(id))).toBe(true)
    expect(Math.max(...frames.map(frame => frame.header))).toBe(0)
    expect(Math.max(...frames.map(frame => frame.top)) - Math.min(...frames.map(frame => frame.top))).toBeLessThan(1)
    const position = await first.evaluate(el => {
      const scroller = document.getElementById('main-scroll-container')
      return { top: el.getBoundingClientRect().top - scroller.getBoundingClientRect().top, height: scroller.clientHeight, remaining: scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight }
    })
    expect(position.top).toBeGreaterThanOrEqual(-1)
    expect(position.top).toBeLessThan(position.height - 30)
    // A short last page clamps at the end of the scroller instead of overscrolling.
    if (position.remaining > 1) expect(position.top).toBeLessThan(1)
    await expect(page.locator('[data-list-pagination] [aria-current="page"]')).toHaveText(String(expectedPage))
  }
  await checkPage(page.getByRole('button', { name: '下一页', exact: true }), 11, 2)
  await checkPage(page.getByRole('button', { name: '上一页', exact: true }), 1, 1)
  await checkPage(page.getByRole('button', { name: '第 5 页', exact: true }), 990, 5)
  await expect(page.getByRole('button', { name: '下一页', exact: true })).toBeDisabled()
})

test('filters patch existing nodes without whole-view animations', async ({ page }) => {
  await mockApi(page)
  await visit(page, '/list?cat=java%2Fbasics')
  const row = page.locator('[data-question-id="3"]')
  await row.evaluate(el => { window.originalRow = el })
  const headingY = await page.locator('h1').evaluate(el => el.getBoundingClientRect().y)
  await page.getByRole('button', { name: '简单', exact: true }).click()
  expect(await row.evaluate(el => window.originalRow === el)).toBe(true)
  expect(await page.locator('#view-container').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect.getKeyframes().some(k => k.transform)).length)).toBe(0)
  expect(await page.locator('h1').evaluate(el => el.getBoundingClientRect().y)).toBe(headingY)
  await page.getByRole('button', { name: '清除当前筛选', exact: true }).click()
  await expect(page.getByRole('button', { name: '简单', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '清除难度筛选', exact: true }).click()
  await expect(page.locator('[data-question-id]')).toHaveCount(10)
})

test('sidebar is section-only and retains nodes while centering the current question', async ({ page, isMobile }) => {
  await mockApi(page)
  await visit(page, '/q/12')
  await sidebar(page, isMobile)
  await expect(page.locator('[data-sbactive]')).toHaveCount(25)
  await page.locator('[data-sbactive="1"]').evaluate(el => { window.oldSidebarNode = el })
  const delta = await page.locator('[data-sbactive="1"]').evaluate(el => { const wrap = el.closest('#sidebar-question-scroll'); return Math.abs((el.getBoundingClientRect().top - wrap.getBoundingClientRect().top) - (wrap.clientHeight - el.clientHeight) / 2) })
  expect(delta).toBeLessThan(12)
  if (isMobile) await page.getByRole('button', { name: '关闭分类导航', exact: true }).last().click()
  await page.getByRole('button', { name: '下一题 →', exact: true }).click()
  await sidebar(page, isMobile)
  expect(await page.evaluate(() => window.oldSidebarNode.isConnected)).toBe(true)
  await expect(page.locator('[data-sbactive="1"]')).toContainText('#13')
})

test('next section crosses tracks and final section returns to list', async ({ page }) => {
  await mockApi(page)
  await visit(page, '/q/25')
  await page.getByRole('button', { name: /下一小节/ }).click()
  await expect(page).toHaveURL(/\/q\/57$/)
  await page.goto('/q/70')
  await page.getByRole('button', { name: /下一小节/ }).click()
  await expect(page).toHaveURL(/\/q\/166$/)
  await page.goto('/q/990')
  await page.getByRole('button', { name: '返回题库', exact: true }).click()
  await expect(page).toHaveURL(/\/list$/)
})

test('favorites sync immediately in list, detail, and sidebar without remount', async ({ page, isMobile }) => {
  const api = await mockApi(page, true)
  await visit(page, '/list')
  await page.locator('[data-question-id="1"]').evaluate(el => { window.favoriteRow = el })
  await page.locator('[data-fav-id="1"]').click()
  await expect(page.locator('[data-fav-id="1"]')).toHaveAttribute('title', '取消收藏')
  expect(await page.evaluate(() => window.favoriteRow.isConnected)).toBe(true)
  await expect(page.locator('#sidebar-fav-count')).toHaveText('1')
  await page.goto('/q/1')
  await expect(page.locator('[data-fav-id="1"]')).toContainText('已收藏')
  await page.locator('[data-fav-id="1"]').click()
  await expect(page.locator('[data-fav-id="1"]')).toContainText('收藏')
  await expect(page.locator('#sidebar-fav-count')).toHaveText('0')
  expect(api.calls).toHaveLength(2)
  expect(api.calls.every(c => c.method === 'POST')).toBe(true)
})

test('rating updates progress, wrongbook, and auto-next uses current question', async ({ page }) => {
  await mockApi(page, true)
  await visit(page, '/q/1')
  await page.getByRole('button', { name: '有点模糊', exact: true }).click()
  await expect(page).toHaveURL(/\/q\/2$/)
  await expect(page.locator('#header-fuzzy-count')).toHaveText('1')
  await page.goto('/wrongbook')
  await expect(page.locator('[data-question-id="1"]')).toBeVisible()
  await page.locator('[data-question-id="1"] a').click()
  await page.getByRole('button', { name: '掌握了', exact: true }).click()
  await page.goto('/wrongbook')
  await expect(page.locator('[data-list-empty]')).toBeVisible()
})

test('answer sections code copy and study preference survive route changes', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => { window.copiedCode = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedCode = text } }, configurable: true }) })
  await visit(page, '/q/1')
  await page.getByRole('button', { name: /查看答案/ }).click()
  await expect(page.locator('.answer-table-wrap table')).toBeVisible()
  await page.getByRole('button', { name: /代码示例/ }).click()
  await expect(page.locator('#answer-code')).toBeVisible()
  await page.getByRole('button', { name: '复制代码', exact: true }).click()
  expect(await page.evaluate(() => window.copiedCode)).toBe('print(1)')
  await page.getByLabel('背题模式（默认展开答案）').check()
  await page.getByRole('button', { name: '下一题 →', exact: true }).click()
  await expect(page.locator('#answer-content')).toContainText('核心 2')
  await expect(page.locator('#answer-code')).toBeHidden()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#answer-content')).toContainText('核心 2')
})

test('login gate and custom logout dialog support cancel and escape', async ({ page }) => {
  await mockApi(page)
  await visit(page, '/favorites')
  await page.getByRole('button', { name: '登录并同步', exact: true }).click()
  await page.locator('#login-username').fill('fixture-user')
  await page.locator('#login-password').fill('fixture-password')
  await page.locator('#btn-login-submit').click()
  await expect(page.locator('#login-modal')).toHaveCount(0)
  await expect(page.locator('#auth-btn-label')).toHaveText('测试用户')
  await page.locator('#btn-auth-trigger').click()
  await expect(page.locator('#confirm-title')).toHaveText('退出登录')
  await page.keyboard.press('Escape')
  await expect(page.locator('#confirm-modal')).toHaveCount(0)
  await page.locator('#btn-auth-trigger').click()
  await page.locator('#confirm-ok').click()
  await expect(page.locator('#auth-btn-label')).toHaveText('登录 / 注册')
  expect(await page.evaluate(() => localStorage.getItem('mianshi_token'))).toBeNull()
})

test('mobile drawer covers sticky navbar and search/theme remain functional', async ({ page, isMobile }) => {
  await mockApi(page)
  await visit(page, '/q/60')
  if (isMobile) {
    await sidebar(page, true)
    await expect.poll(() => page.locator('#app-sidebar').evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + 70, 170); return r.left >= -1 && el.contains(hit) })).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.locator('#app-sidebar')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('#app-sidebar')).toHaveAttribute('inert', '')
    await expect(page.locator('#mobile-sidebar-backdrop')).toBeHidden()
    await page.locator('#theme-btn-mobile').click()
  } else await page.locator('#theme-btn-dark').click()
  await page.locator('#global-search-input').fill('JVM')
  await page.locator('#global-search-input').press('Enter')
  await expect(page).toHaveURL(/q=JVM/)
  await expect(page.locator('[data-question-id]')).toHaveCount(10)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
