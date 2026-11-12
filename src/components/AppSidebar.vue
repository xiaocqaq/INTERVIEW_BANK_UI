<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank'
import Icon from './Icon.vue'
import StatusDot from './StatusDot.vue'

const store = useBankStore()
const route = useRoute()
const router = useRouter()
const desktop = ref(typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches)
const sidebar = ref(null)
const questionScroll = ref(null)
const closeButton = ref(null)
let media
let resizeObserver
let frame = 0
let previousFocus
const isDetail = computed(() => route.path.startsWith('/q/'))
const currentQuestion = computed(() => {
  const id = isDetail.value ? route.params.id : store.currentQuestionId || store.lastQuestionId
  return store.findQuestion(id) || (!isDetail.value ? store.questions[0] : null)
})
const scopedQuestions = computed(() => {
  if (isDetail.value) {
    const current = currentQuestion.value
    return current ? store.questions.filter(q => q.track === current.track && q.categoryId === current.categoryId) : []
  }
  if (route.path === '/favorites') return store.questions.filter(q => q.favorite)
  if (route.path === '/wrongbook') return store.questions.filter(q => q.lastStatus === 'fuzzy' || q.lastStatus === 'unknown')
  if (route.path === '/list') return store.questions.filter(q => (!route.query.cat || String(q.categoryId) === String(route.query.cat)) && (!route.query.track || q.track === route.query.track))
  const current = currentQuestion.value
  return current ? store.questions.filter(q => q.track === current.track && q.categoryId === current.categoryId) : []
})
const scopeTitle = computed(() => {
  if (isDetail.value) return currentQuestion.value?.categoryName || '当前小节'
  if (route.path === '/favorites') return '我的收藏'
  if (route.path === '/wrongbook') return '错题本 · 待攻克'
  if (route.path === '/list') {
    for (const group of store.groups) {
      const category = group.categories.find(cat => String(cat.id) === String(route.query.cat))
      if (category) return category.name
      if (!route.query.cat && group.id === route.query.track) return group.name
    }
    return '全部题目'
  }
  return currentQuestion.value?.categoryName || '本节题目'
})
const visibleQuestions = computed(() => {
  const keyword = store.sidebarSearch.trim().toLowerCase()
  return scopedQuestions.value.filter(q => {
    if (store.sidebarStatusFilter !== 'all' && (q.lastStatus || 'unrated') !== store.sidebarStatusFilter) return false
    return !keyword || [q.title, q.categoryName, ...(q.tags || [])].some(value => String(value || '').toLowerCase().includes(keyword))
  })
})
const masteryPercent = computed(() => scopedQuestions.value.length ? Math.round(scopedQuestions.value.filter(q => q.lastStatus === 'mastered').length * 100 / scopedQuestions.value.length) : 0)
const navItems = computed(() => [
  { id: 'nav-home', path: '/', label: '题库首页', icon: 'home' },
  { id: 'nav-all', path: '/list', label: '全部题目', icon: 'list', countId: 'nav-all-count', count: store.stats.total, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { id: 'nav-favorites', path: '/favorites', label: '我的收藏', icon: 'star', countId: 'sidebar-fav-count', count: store.stats.favTotal, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: 'nav-wrongbook', path: '/wrongbook', label: '错题本 (待攻克)', icon: 'alert', countId: 'sidebar-wrong-count', count: store.stats.wrongTotal, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
])
function navActive(item) { return route.path === item.path && (item.path !== '/list' || !route.query.cat) }
function isCurrent(question) { return isDetail.value && String(question.id) === String(route.params.id) }
function categoryActive(category) {
  return route.path === '/list' ? String(route.query.cat) === String(category.id) : isDetail.value && String(currentQuestion.value?.categoryId) === String(category.id)
}
function go(target) { store.sidebarOpen = false; router.push(target) }
function toggleTrack(id) { store.expandedTracks[id] = store.expandedTracks[id] === false }
function clearFilters() { store.sidebarSearch = ''; store.sidebarStatusFilter = 'all' }
function difficultyClass(question) {
  if (question.difficulty === '简单' || question.difficultyCode === 'easy') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
  if (question.difficulty === '中等' || question.difficultyCode === 'medium') return 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
  return 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
}
async function centerCurrent() {
  await nextTick()
  if (frame) cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    frame = 0
    const wrap = questionScroll.value
    if (!wrap || store.sidebarTab !== 'questions' || (!desktop.value && !store.sidebarOpen) || wrap.clientHeight <= 0) return
    const item = wrap.querySelector('[data-sbactive="1"]')
    if (!item) return
    const delta = item.getBoundingClientRect().top - wrap.getBoundingClientRect().top
    wrap.scrollTop = Math.max(0, wrap.scrollTop + delta - (wrap.clientHeight - item.offsetHeight) / 2)
  })
}
function handleKeydown(event) {
  if (desktop.value || !store.sidebarOpen || store.loginOpen || store.confirm) return
  if (event.key === 'Escape') { event.preventDefault(); store.sidebarOpen = false; return }
  if (event.key !== 'Tab') return
  const elements = [...sidebar.value.querySelectorAll('button:not(:disabled), input, select, a[href]')].filter(el => el.getClientRects().length)
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && (document.activeElement === first || !sidebar.value.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && (document.activeElement === last || !sidebar.value.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
}
watch(() => route.fullPath, () => {
  store.sidebarOpen = false
  store.sidebarTab = isDetail.value || ['/favorites', '/wrongbook'].includes(route.path) ? 'questions' : 'categories'
}, { immediate: true })
watch([() => route.params.id, () => visibleQuestions.value.map(q => q.id).join(','), () => store.sidebarTab, () => store.sidebarOpen, desktop], centerCurrent, { flush: 'post' })
watch(() => store.sidebarOpen, async open => {
  if (desktop.value) return
  if (open) {
    previousFocus = document.activeElement
    await nextTick()
    closeButton.value?.focus()
  } else if (!store.loginOpen && !store.confirm) {
    await nextTick()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
})
onMounted(() => {
  media = window.matchMedia('(min-width: 1024px)')
  media.addEventListener('change', updateViewport)
  window.addEventListener('keydown', handleKeydown)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(centerCurrent)
    if (questionScroll.value) resizeObserver.observe(questionScroll.value)
  }
  centerCurrent()
})
function updateViewport(event) { desktop.value = event.matches; if (event.matches) store.sidebarOpen = false }
onBeforeUnmount(() => {
  media?.removeEventListener('change', updateViewport)
  window.removeEventListener('keydown', handleKeydown)
  resizeObserver?.disconnect()
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <Teleport to="body">
    <div id="mobile-sidebar-backdrop" v-show="!desktop && store.sidebarOpen" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm lg:hidden" style="z-index: 79" aria-hidden="true" @click="store.sidebarOpen = false"></div>
  </Teleport>
  <Teleport to="body" :disabled="desktop">
    <aside id="app-sidebar" ref="sidebar" class="fixed lg:static inset-y-0 left-0 w-80 max-w-[calc(100vw-2rem)] lg:max-w-none shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out" :class="!desktop && !store.sidebarOpen ? '-translate-x-full' : 'translate-x-0'" :style="{ zIndex: desktop ? 'auto' : 80 }" :role="desktop ? 'complementary' : 'dialog'" :aria-modal="!desktop && store.sidebarOpen ? true : undefined" :aria-hidden="!desktop && !store.sidebarOpen ? true : undefined" :inert="!desktop && !store.sidebarOpen ? true : undefined" aria-label="题库导航">
      <div class="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0"><span class="text-sm font-bold text-slate-900 dark:text-white">题库导航</span><button id="btn-close-sidebar" ref="closeButton" type="button" class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="关闭分类导航" @click="store.sidebarOpen = false"><Icon name="close" :size="18" /></button></div>
      <nav class="p-3.5 border-b border-slate-100 dark:border-slate-800/70 space-y-1 shrink-0" aria-label="快捷导航">
        <button v-for="item in navItems" :id="item.id" :key="item.id" type="button" class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors" :class="navActive(item) ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'" :aria-current="navActive(item) ? 'page' : undefined" @click="go(item.path)">
          <span class="flex items-center gap-2.5"><Icon :name="item.icon" :size="16" :class="item.icon === 'star' ? 'text-amber-500' : item.icon === 'alert' ? 'text-rose-500' : ''" /><span>{{ item.label }}</span></span>
          <span v-if="item.countId" :id="item.countId" class="px-2 py-0.5 text-xs font-mono rounded-full" :class="item.color">{{ item.count }}</span>
        </button>
      </nav>
      <div class="px-3.5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
        <div class="grid grid-cols-2 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 text-xs font-semibold" role="tablist" aria-label="侧栏内容">
          <button id="sidebar-tab-questions" type="button" role="tab" aria-controls="sidebar-question-list" :aria-selected="store.sidebarTab === 'questions'" class="py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition" :class="store.sidebarTab === 'questions' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'" @click="store.sidebarTab = 'questions'" @keydown.right.prevent="store.sidebarTab = 'categories'; $event.currentTarget.nextElementSibling.focus()"><Icon name="book" :size="14" /><span>本节题目</span></button>
          <button id="sidebar-tab-categories" type="button" role="tab" aria-controls="sidebar-categories" :aria-selected="store.sidebarTab === 'categories'" class="py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition" :class="store.sidebarTab === 'categories' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'" @click="store.sidebarTab = 'categories'" @keydown.left.prevent="store.sidebarTab = 'questions'; $event.currentTarget.previousElementSibling.focus()"><Icon name="grid" :size="14" /><span>题库分类</span></button>
        </div>
      </div>
      <div id="sidebar-question-list" v-show="store.sidebarTab === 'questions'" class="flex flex-1 min-h-0 flex-col overflow-hidden" role="tabpanel" aria-labelledby="sidebar-tab-questions">
        <div class="px-3.5 pt-3 pb-2 space-y-2 border-b border-slate-100 dark:border-slate-800/70 shrink-0">
          <div class="flex items-center justify-between gap-2 text-xs"><span class="font-semibold truncate text-slate-700 dark:text-slate-200">{{ scopeTitle }}</span><span class="text-slate-400 shrink-0">{{ visibleQuestions.length }} / {{ scopedQuestions.length }} 题</span></div>
          <div class="h-1 rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="本节掌握进度" :aria-valuenow="masteryPercent" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full bg-brand-500 transition-[width]" :style="{ width: masteryPercent + '%' }"></div></div>
          <div class="flex items-center gap-2">
            <div class="relative min-w-0 flex-1"><Icon name="search" :size="13" class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /><input id="sidebar-search-input" v-model="store.sidebarSearch" type="search" aria-label="搜索侧栏题目" placeholder="搜索本题单…" class="w-full text-xs py-1.5 pl-7 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500" /></div>
            <select id="sidebar-status-filter" v-model="store.sidebarStatusFilter" aria-label="按掌握状态筛选侧栏" class="text-xs py-1.5 pl-2 pr-5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-brand-500"><option value="all">全部状态</option><option value="mastered">已掌握</option><option value="fuzzy">模糊</option><option value="unknown">不会</option><option value="unrated">未自评</option></select>
          </div>
        </div>
        <div id="sidebar-question-scroll" ref="questionScroll" class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-1.5">
          <div v-if="!visibleQuestions.length" class="py-10 px-3 text-center space-y-2"><div class="text-xs text-slate-400">{{ store.loading ? '正在加载题目…' : '本题单没有匹配的题目' }}</div><button v-if="store.sidebarSearch || store.sidebarStatusFilter !== 'all'" type="button" class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline" @click="clearFilters">清空侧栏筛选</button></div>
          <button v-for="question in visibleQuestions" :key="question.id" type="button" :data-qid="question.id" :data-sbactive="isCurrent(question) ? '1' : '0'" :aria-current="isCurrent(question) ? 'page' : undefined" class="w-full text-left p-2.5 rounded-xl border transition-colors group" :class="isCurrent(question) ? 'bg-brand-500/10 dark:bg-brand-500/15 border-brand-500/40 shadow-sm' : 'bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/70 hover:border-brand-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/60'" @click="go('/q/' + question.id)">
            <span class="flex items-start gap-2.5"><StatusDot :status="question.lastStatus" class="mt-0.5" /><span class="min-w-0 flex-1 space-y-1"><span class="flex items-center justify-between gap-1.5"><span data-sb-num class="font-mono text-[11px] font-semibold" :class="isCurrent(question) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'">#{{ question.id }} · {{ question.categoryName }}</span><span class="flex items-center gap-1 shrink-0"><span v-show="question.favorite" :data-sb-fav="question.id" class="text-amber-500 text-[11px]" title="已收藏">★</span><span class="text-[10px] font-medium px-1.5 py-0.5 rounded" :class="difficultyClass(question)">{{ question.difficulty }}</span></span></span><span data-sb-title class="block text-xs leading-snug line-clamp-2" :class="isCurrent(question) ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'">{{ question.title }}</span></span></span>
          </button>
        </div>
      </div>
      <nav id="sidebar-categories" v-show="store.sidebarTab === 'categories'" class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-4" role="tabpanel" aria-labelledby="sidebar-tab-categories">
        <div v-for="group in store.groups" :key="group.id" class="space-y-1">
          <button type="button" :data-track="group.id" class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition" :aria-expanded="store.expandedTracks[group.id] !== false" :aria-controls="'sidebar-track-' + group.id" @click="toggleTrack(group.id)"><span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" :class="group.dotClass"></span><span>{{ group.name }}</span></span><span class="flex items-center gap-1.5"><span class="font-mono text-[11px] text-slate-400">{{ group.totalCount }} 题</span><Icon name="chevron-down" :size="14" class="transition-transform" :class="{ 'rotate-180': store.expandedTracks[group.id] !== false }" /></span></button>
          <div :id="'sidebar-track-' + group.id" v-show="store.expandedTracks[group.id] !== false" class="space-y-0.5 pl-2"><button v-for="category in group.categories" :key="category.id" type="button" :data-category="category.id" class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" :class="categoryActive(category) ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'" :aria-current="categoryActive(category) ? 'page' : undefined" @click="go({ path: '/list', query: { cat: category.id, track: group.id } })"><span class="truncate">{{ category.name }}</span><span class="font-mono text-[11px]" :class="categoryActive(category) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'">{{ category.count }}</span></button></div>
        </div>
      </nav>
      <div class="p-3.5 border-t border-slate-200/70 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 shrink-0"><div class="flex items-center gap-2 text-xs" role="status"><span id="sync-status-dot" class="w-2 h-2 rounded-full" :class="store.user ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'"></span><span id="sync-status-text" class="text-slate-600 dark:text-slate-400 font-medium">{{ store.user ? '云端同步已开启' : '未登录 · 进度不保存' }}</span></div></div>
    </aside>
  </Teleport>
</template>
