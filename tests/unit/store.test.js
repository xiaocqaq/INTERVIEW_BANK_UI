import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBankStore } from '../../src/stores/bank'
const brief = { id: 1, lang: 'java', category: 'basics', title: '题目', difficulty: 1, tags: [], favorite: false, last_status: null }
const response = data => ({ ok: true, json: async () => data })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()); vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} })) })
afterEach(() => vi.unstubAllGlobals())
describe('session and synchronization races', () => {
  it('reloads anonymous summaries after logout during initial catalog load', async () => {
    const pending = deferred(); let lists = 0; localStorage.setItem('mianshi_token', 'old-token')
    vi.stubGlobal('fetch', vi.fn(async path => {
      if (path.endsWith('/auth/me')) return response({ user: { username: 'old-user' } })
      if (path.includes('/categories')) return response({ categories: [] })
      return ++lists === 1 ? pending.promise : response({ total: 1, items: [brief] })
    }))
    const store = useBankStore(); const boot = store.boot()
    await vi.waitFor(() => expect(lists).toBe(1)); store.logout()
    pending.resolve(response({ total: 1, items: [{ ...brief, favorite: true }] })); await boot
    expect(store.ready).toBe(true); expect(store.questions).toHaveLength(1)
    expect(store.findQuestion(1).favorite).toBe(false); expect(store.user).toBeNull()
  })
  it('does not restore an old user after logout during bootstrap', async () => {
    const me = deferred(); localStorage.setItem('mianshi_token', 'old-token')
    vi.stubGlobal('fetch', vi.fn(async path => path.endsWith('/auth/me') ? me.promise : response(path.includes('/categories') ? { categories: [] } : { total: 1, items: [brief] })))
    const store = useBankStore(); const boot = store.boot(); store.logout()
    me.resolve(response({ user: { username: 'old-user' } })); await boot
    expect(store.user).toBeNull(); expect(store.token).toBe('')
  })
  it('preserves favorite writes completed while a catalog refresh is in flight', async () => {
    const refresh = deferred(); let lists = 0
    vi.stubGlobal('fetch', vi.fn(async path => {
      if (path.endsWith('/auth/login')) return response({ token: 'new-token', user: { username: 'new-user' } })
      if (path.endsWith('/favorite')) return response({ ok: true, favorite: true })
      if (path.includes('/categories')) return response({ categories: [] })
      return ++lists === 1 ? response({ total: 1, items: [brief] }) : refresh.promise
    }))
    const store = useBankStore(); await store.boot()
    const login = store.login('test', 'password'); await vi.waitFor(() => expect(lists).toBe(2))
    await store.toggleFavorite(1)
    refresh.resolve(response({ total: 1, items: [{ ...brief, last_status: 1 }] })); await login
    expect(store.findQuestion(1).favorite).toBe(true)
    expect(store.findQuestion(1).lastStatus).toBe('mastered')
  })
})
