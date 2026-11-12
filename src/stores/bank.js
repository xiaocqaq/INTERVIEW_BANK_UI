import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { TRACK_META, CATEGORY_DESC } from '../data/catalog'
import { createApiClient } from '../services/api'
import { decorateQuestion, siblings, nextSection, resumeTarget, STATUS_CODE } from '../utils/questions'

const PREF_KEY = 'mianshi_ui_prefs'
const TOKEN_KEY = 'mianshi_token'
function stored(key, fallback) { try { return localStorage.getItem(key) || fallback } catch { return fallback } }
function preferences() { try { return JSON.parse(stored(PREF_KEY, '{}')) || {} } catch { return {} } }
function persist(key, value) { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key) } catch { /* Private browsing can disable storage. */ } }

export const useBankStore = defineStore('bank', () => {
  const prefs = preferences()
  const token = ref(stored(TOKEN_KEY, ''))
  const user = ref(null)
  const questions = ref([])
  const groups = ref(TRACK_META.map(g => ({ ...g, categories: [] })))
  const details = ref({})
  const ready = ref(false), loading = ref(false), error = ref('')
  const currentQuestionId = ref(null)
  const lastQuestionId = ref(Number.isFinite(prefs.lastQuestionId) ? prefs.lastQuestionId : null)
  const homeTrackFilter = ref('all')
  const sidebarTab = ref('categories'), sidebarOpen = ref(false), sidebarSearch = ref(''), sidebarStatusFilter = ref('all')
  const expandedTracks = ref({ java: true, python: true, llm: true, ...prefs.expandedTracks })
  const alwaysExpandAnswer = ref(prefs.alwaysExpandAnswer === true)
  const autoNextOnRate = ref(prefs.autoNextOnRate !== false)
  const themeMode = ref(['light', 'dark', 'system'].includes(prefs.themeMode) ? prefs.themeMode : 'system')
  const loginOpen = ref(false), confirm = ref(null), toasts = ref([])
  const favoritePending = ref({}), ratingPending = ref({})
  let resolver = null, bootPromise = null, authEpoch = 0, toastId = 0
  const detailRequests = new Map()
  const personalRevisions = new Map()
  let personalRevision = 0
  function markPersonalChange(id, field) {
    personalRevisions.set(Number(id), { ...personalRevisions.get(Number(id)), [field]: ++personalRevision })
  }

  const stats = computed(() => {
    const count = { total: questions.value.length, mastered: 0, fuzzy: 0, unknown: 0, done: 0, wrongTotal: 0, favTotal: 0 }
    for (const q of questions.value) {
      if (q.lastStatus) { count[q.lastStatus]++; count.done++ }
      if (q.lastStatus === 'fuzzy' || q.lastStatus === 'unknown') count.wrongTotal++
      if (q.favorite) count.favTotal++
    }
    return count
  })
  function clearAuth() {
    authEpoch++
    token.value = ''; user.value = null; details.value = {}; detailRequests.clear()
    persist(TOKEN_KEY, '')
    questions.value.forEach(q => { q.favorite = false; q.lastStatus = null; q.inWrongBook = false })
  }
  const request = createApiClient({ getToken: () => token.value, onUnauthorized: clearAuth })
  function notify(message, type = 'info') {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 2800)
  }
  function savePreferences() {
    persist(PREF_KEY, JSON.stringify({ themeMode: themeMode.value, expandedTracks: expandedTracks.value,
      alwaysExpandAnswer: alwaysExpandAnswer.value, autoNextOnRate: autoNextOnRate.value,
      lastQuestionId: lastQuestionId.value }))
  }
  watch([themeMode, expandedTracks, alwaysExpandAnswer, autoNextOnRate, lastQuestionId], savePreferences, { deep: true, flush: 'sync' })
  function applyTheme() {
    const dark = themeMode.value === 'dark' || (themeMode.value === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', !!dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }
  function setTheme(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) return
    themeMode.value = mode
    window.MxTheme?.set(mode)
    applyTheme()
  }
  watch(themeMode, applyTheme)
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
  window.addEventListener('storage', event => {
    if (event.key === PREF_KEY) {
      const next = preferences()
      if (['light', 'dark', 'system'].includes(next.themeMode)) themeMode.value = next.themeMode
      if (Number.isFinite(next.lastQuestionId)) lastQuestionId.value = next.lastQuestionId
    }
  })
  window.addEventListener('mx-theme-change', event => {
    const mode = event.detail?.mode || event.detail
    if (['light', 'dark', 'system'].includes(mode)) themeMode.value = mode
  })
  // External theme sync is optional; local preferences work if it cannot load.
  if (window.MxTheme) { const mode = window.MxTheme.get(); if (['light', 'dark', 'system'].includes(mode)) themeMode.value = mode }
  applyTheme()

  async function loadQuestions() {
    const epoch = authEpoch, revision = personalRevision, collected = []
    let total = Infinity
    for (let page = 1; collected.length < total; page++) {
      const data = await request('/questions?page=' + page + '&page_size=200')
      if (epoch !== authEpoch) return false
      total = data.total || 0
      if (!data.items?.length) break
      collected.push(...data.items)
    }
    const existing = new Map(questions.value.map(q => [q.id, q]))
    questions.value = collected.map(raw => {
      const q = decorateQuestion(raw, groups.value)
      const current = existing.get(q.id)
      const changed = personalRevisions.get(q.id) || {}
      if (current && changed.favorite > revision) q.favorite = current.favorite
      if (current && changed.rating > revision) { q.lastStatus = current.lastStatus; q.inWrongBook = current.inWrongBook }
      return q
    })
    return true
  }
  async function boot(force = false) {
    if (bootPromise) return bootPromise
    if (ready.value && !force) return
    loading.value = true; error.value = ''
    bootPromise = (async () => {
      try {
        if (token.value) {
          const epoch = authEpoch
          try {
            const result = await request('/auth/me')
            if (epoch === authEpoch) user.value = result.user
          } catch (e) { if (e.status !== 401 && epoch === authEpoch) throw e }
        }
        const data = await request('/categories')
        groups.value = TRACK_META.map(g => {
          const categories = (data.categories || []).filter(c => c.lang === g.id).map(c => ({
            id: c.lang + '/' + c.slug, slug: c.slug, name: c.name, count: c.count,
            desc: CATEGORY_DESC[c.lang + '/' + c.slug] || '', trackId: c.lang }))
          return { ...g, categories, totalCount: categories.reduce((n, c) => n + c.count, 0) }
        })
        while (!(await loadQuestions())) { /* Session changed: reload summaries for the current user. */ }
        ready.value = true
      } catch (e) { error.value = e.message; throw e }
      finally { loading.value = false; bootPromise = null }
    })()
    return bootPromise
  }
  const findQuestion = id => questions.value.find(q => q.id === Number(id)) || null
  const getSiblings = q => siblings(questions.value, q)
  const getNextSection = q => nextSection(groups.value, questions.value, q)
  const heroTargetQuestion = () => resumeTarget(questions.value, lastQuestionId.value, homeTrackFilter.value)
  function rememberQuestion(id) { currentQuestionId.value = Number(id); lastQuestionId.value = Number(id) }
  async function loadDetail(id) {
    id = Number(id)
    if (details.value[id]) return details.value[id]
    if (detailRequests.has(id)) return detailRequests.get(id)
    const epoch = authEpoch
    const promise = request('/questions/' + id).then(data => {
      if (epoch !== authEpoch) return data
      details.value[id] = data
      if (!findQuestion(id)) {
        questions.value.push(decorateQuestion(data, groups.value)); questions.value.sort((a, b) => a.id - b.id)
      }
      return data
    }).finally(() => { if (detailRequests.get(id) === promise) detailRequests.delete(id) })
    detailRequests.set(id, promise)
    return promise
  }
  function requireLogin(message) {
    if (user.value) return true
    notify(message); loginOpen.value = true; return false
  }
  async function toggleFavorite(id) {
    if (!requireLogin('请先登录，收藏才能同步到云端') || favoritePending.value[id]) return false
    const epoch = authEpoch
    favoritePending.value[id] = true
    try {
      const data = await request('/questions/' + id + '/favorite', { method: 'POST' })
      if (epoch !== authEpoch) return false
      const q = findQuestion(id)
      if (q) { q.favorite = !!data.favorite; markPersonalChange(id, 'favorite') }
      if (details.value[id]) details.value[id].favorite = !!data.favorite
      notify(data.favorite ? '已加入我的收藏夹' : '已从我的收藏移除', 'success')
      return true
    } catch (e) { notify('操作失败：' + e.message); return false }
    finally { delete favoritePending.value[id] }
  }
  async function rateQuestion(id, status) {
    if (!STATUS_CODE[status] || !requireLogin('请先登录，自评结果才能保存') || ratingPending.value[id]) return false
    const epoch = authEpoch
    ratingPending.value[id] = true
    try {
      await request('/questions/' + id + '/record', { method: 'POST', body: { status: STATUS_CODE[status] } })
      if (epoch !== authEpoch) return false
      const q = findQuestion(id)
      if (q) { q.lastStatus = status; q.inWrongBook = status === 'fuzzy' || status === 'unknown'; markPersonalChange(id, 'rating') }
      if (details.value[id]) details.value[id].last_status = STATUS_CODE[status]
      notify({ mastered: '已标记为「掌握了」', fuzzy: '已标记为「有点模糊」（进入错题本）', unknown: '已标记为「还不会」（进入错题本）' }[status], status === 'mastered' ? 'success' : 'warning')
      return true
    } catch (e) { notify('记录失败：' + e.message); return false }
    finally { delete ratingPending.value[id] }
  }
  async function login(username, password) {
    const epoch = ++authEpoch
    const data = await request('/auth/login', { method: 'POST', body: { username, password } })
    if (epoch !== authEpoch) return false
    token.value = data.token; user.value = data.user; details.value = {}; detailRequests.clear()
    persist(TOKEN_KEY, data.token)
    await loadQuestions()
    if (epoch !== authEpoch) return false
    loginOpen.value = false; notify('登录成功，学习记录已同步', 'success')
    return data.user
  }
  function logout() { clearAuth(); sidebarOpen.value = false; notify('已退出登录') }
  function askConfirm(opts = {}) {
    if (resolver) resolveConfirm(false)
    confirm.value = { title: '请确认', message: '', okText: '确定', ...opts }
    return new Promise(resolve => { resolver = resolve })
  }
  function resolveConfirm(ok) { confirm.value = null; const done = resolver; resolver = null; done?.(!!ok) }
  async function requestLogout() {
    if (await askConfirm({ title: '退出登录', message: '退出后自评与收藏将不再同步到云端，重新登录即可恢复。', okText: '退出登录', tone: 'danger' })) logout()
  }
  return { questions, groups, stats, details, user, token, ready, loading, error, currentQuestionId, lastQuestionId,
    homeTrackFilter, sidebarTab, sidebarOpen, sidebarSearch, sidebarStatusFilter, expandedTracks, alwaysExpandAnswer,
    autoNextOnRate, themeMode, loginOpen, confirm, toasts, favoritePending, ratingPending,
    boot, loadDetail, findQuestion, getSiblings, getNextSection, rememberQuestion, heroTargetQuestion,
    toggleFavorite, rateQuestion, login, logout, requestLogout, notify, askConfirm, resolveConfirm, setTheme, savePreferences }
})
