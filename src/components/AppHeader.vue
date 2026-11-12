<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank'
import { useHeaderScroll } from '../composables/useHeaderScroll'
import Icon from './Icon.vue'

const store = useBankStore()
const route = useRoute()
const router = useRouter()
const searchInput = ref(null)
const search = ref('')
const modes = [{ id: 'light', icon: 'sun', label: '浅色模式' }, { id: 'dark', icon: 'moon', label: '深色模式' }, { id: 'system', icon: 'monitor', label: '跟随系统' }]
const currentMode = computed(() => modes.find(mode => mode.id === store.themeMode) || modes[2])
const { hidden, reveal } = useHeaderScroll(route, () => store.sidebarOpen || store.loginOpen || Boolean(store.confirm))
watch(() => route.query.q, value => { search.value = typeof value === 'string' ? value : '' }, { immediate: true })

function submitSearch() {
  store.sidebarOpen = false
  const query = search.value.trim()
  router.push({ path: '/list', query: query ? { q: query } : {} })
}
function clearSearch() {
  search.value = ''
  if (route.path === '/list') {
    const query = { ...route.query }
    delete query.q
    delete query.page
    router.push({ path: '/list', query })
  }
  searchInput.value?.focus()
}
function cycleTheme() {
  const index = modes.findIndex(mode => mode.id === store.themeMode)
  store.setTheme(modes[(index + 1) % modes.length].id)
}
function accountClick() {
  store.sidebarOpen = false
  if (store.user) store.requestLogout()
  else store.loginOpen = true
}
function searchShortcut(event) {
  if (event.key !== '/' || event.ctrlKey || event.altKey || event.metaKey || store.loginOpen || store.confirm) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
  event.preventDefault()
  reveal()
  nextTick(() => searchInput.value?.focus())
}
onMounted(() => window.addEventListener('keydown', searchShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', searchShortcut))
</script>

<template>
  <header id="app-header" class="sticky top-0 z-30 h-16 glass-header bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 flex-nowrap" :class="{ 'header-hidden': hidden }">
    <div class="flex items-center gap-3 min-w-0">
      <button id="btn-mobile-menu" type="button" class="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-controls="app-sidebar" :aria-expanded="store.sidebarOpen" :aria-label="store.sidebarOpen ? '关闭分类导航' : '打开分类导航'" @click="store.sidebarOpen = !store.sidebarOpen">
        <Icon name="menu" />
      </button>
      <RouterLink to="/" class="flex items-center gap-2.5 group shrink-0 rounded-xl focus-visible:outline-brand-500" aria-label="面试刷题库首页">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform"><Icon name="shield" /></div>
        <div class="hidden sm:flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-base tracking-tight text-slate-900 dark:text-white">面试刷题库</span>
            <span class="hidden md:inline-block text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">INTERVIEW BANK</span>
          </div>
          <span id="brand-subtitle" class="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block" data-count-total>Java · Python · 大模型应用</span>
        </div>
      </RouterLink>
    </div>
    <div class="flex-1 min-w-0 max-w-md mx-1 sm:mx-2">
      <form id="global-search-form" role="search" class="relative group" @submit.prevent="submitSearch">
        <Icon name="search" :size="16" class="text-slate-400 group-focus-within:text-brand-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
        <input id="global-search-input" ref="searchInput" v-model="search" type="search" autocomplete="off" aria-label="搜索题目和考点" placeholder="搜索题目、考点（如 Spring / GIL / RAG），回车搜索…" class="w-full pl-9 pr-16 py-2 text-sm rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-transparent focus:border-brand-500/60 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all" />
        <button id="btn-clear-search" v-show="search.length" type="button" class="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md" title="清空搜索" aria-label="清空搜索" @click="clearSearch"><Icon name="close" :size="14" /></button>
        <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">/</kbd>
      </form>
    </div>
    <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
      <button id="btn-header-progress" type="button" class="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs transition" title="点击查看错题本与掌握进度" @click="router.push('/wrongbook')">
        <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span id="header-mastered-count">{{ store.stats.mastered }}</span> 掌握</span>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span id="header-fuzzy-count">{{ store.stats.fuzzy }}</span> 模糊</span>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <span class="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium"><span class="w-2 h-2 rounded-full bg-rose-500"></span><span id="header-unknown-count">{{ store.stats.unknown }}</span> 不会</span>
      </button>
      <button id="theme-btn-mobile" type="button" class="sm:hidden shrink-0 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 transition" :title="currentMode.label + '，点击切换主题'" :aria-label="currentMode.label + '，点击切换主题'" @click="cycleTheme"><Icon :name="currentMode.icon" :size="16" /></button>
      <div class="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70" role="group" aria-label="主题切换">
        <button v-for="mode in modes" :id="'theme-btn-' + mode.id" :key="mode.id" type="button" class="p-1.5 rounded-lg transition" :class="store.themeMode === mode.id ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'" :title="mode.label" :aria-label="mode.label" :aria-pressed="store.themeMode === mode.id" @click="store.setTheme(mode.id)"><Icon :name="mode.icon" :size="16" /></button>
      </div>
      <button id="btn-auth-trigger" type="button" class="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-600/20 transition" :title="store.user ? '退出登录' : '登录 / 注册'" :aria-label="store.user ? '退出登录：' + (store.user.display_name || store.user.username) : '登录 / 注册'" @click="accountClick"><Icon name="user" :size="16" /><span id="auth-btn-label" class="hidden sm:inline max-w-[8rem] truncate">{{ store.user ? (store.user.display_name || store.user.username) : '登录 / 注册' }}</span></button>
    </div>
  </header>
</template>
