<script>
import { reactive } from 'vue'

// These UI filters survive navigation between list modes. Scope and page live in the URL.
const listFilters = reactive({ difficulty: 'all', mastery: 'all' })
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank.js'
import Icon from '../components/Icon.vue'
import QuestionRow from '../components/QuestionRow.vue'
import ListFilters from '../components/ListFilters.vue'
import ListPagination from '../components/ListPagination.vue'

const bank = useBankStore()
const route = useRoute()
const router = useRouter()
const PAGE_SIZE = 10
const pendingPage = ref(null)
let pageNavigation = 0
const queryText = value => typeof value === 'string' ? value : Array.isArray(value) ? value[0] || '' : ''
const mode = computed(() => route.path === '/favorites' ? 'favorites' : route.path === '/wrongbook' ? 'wrongbook' : 'all')
const track = computed(() => queryText(route.query.track) || 'all')
const category = computed(() => queryText(route.query.cat) || 'all')
const search = computed(() => queryText(route.query.q).trim())
const needLogin = computed(() => mode.value !== 'all' && !bank.user)
const selectedGroup = computed(() => bank.groups.find(group => group.id === track.value))
const selectedCategory = computed(() => {
  for (const group of bank.groups) {
    const found = group.categories.find(item => item.id === category.value)
    if (found) return { category: found, group }
  }
  return null
})
const heading = computed(() => {
  if (mode.value === 'favorites') return { title: '我的收藏夹', subtitle: '重点标记的高频面试题与核心架构考点，随时回顾背诵' }
  if (mode.value === 'wrongbook') return { title: '错题本（待攻克）', subtitle: '自动收录自评为「有点模糊」或「还不会」的题目，针对性查漏补缺' }
  if (selectedCategory.value) {
    const { category: item, group } = selectedCategory.value
    return { title: item.name + ' 专项题库', subtitle: group.name + ' · 共 ' + item.count + ' 道题 · ' + (item.desc || '') }
  }
  if (selectedGroup.value) {
    const group = selectedGroup.value
    return { title: group.name + ' · 全部专题', subtitle: group.name + ' 下共 ' + group.totalCount + ' 道题，可继续按专题、难度与掌握度筛选' }
  }
  return { title: '全部面试题目', subtitle: '支持按技术方向、专题分类、难度等级与自评状态组合筛选' }
})
const scopeLabel = computed(() => {
  const labels = []
  if (search.value) labels.push('搜索：' + search.value)
  if (category.value !== 'all') labels.push(selectedCategory.value?.category.name || category.value)
  else if (track.value !== 'all') labels.push(selectedGroup.value?.name || track.value)
  return labels.join(' · ')
})
const filtered = computed(() => {
  if (needLogin.value) return []
  const keyword = search.value.toLowerCase()
  return bank.questions.filter(question => {
    if (mode.value === 'favorites' && !question.favorite) return false
    if (mode.value === 'wrongbook' && !['fuzzy', 'unknown'].includes(question.lastStatus)) return false
    if (track.value !== 'all' && question.track !== track.value) return false
    if (category.value !== 'all' && question.categoryId !== category.value) return false
    if (listFilters.difficulty !== 'all' && question.difficulty !== listFilters.difficulty) return false
    if (listFilters.mastery !== 'all' && (question.lastStatus || 'unrated') !== listFilters.mastery) return false
    if (keyword && ![question.title, question.categoryName, ...(question.tags || [])].some(value => String(value || '').toLowerCase().includes(keyword))) return false
    return true
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const requestedPage = computed(() => {
  const value = route.query.page
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return 1
  const number = Number(value)
  if (!Number.isFinite(number)) return Number.MAX_SAFE_INTEGER
  return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, number))
})
const page = computed(() => Math.min(pendingPage.value ?? requestedPage.value, totalPages.value))
const shown = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

// Run after Vue patches the rows, before the browser paints the new page.
watch(page, () => {
  const scroller = document.getElementById('main-scroll-container')
  const firstRow = scroller?.querySelector('[data-question-id]')
  if (!firstRow) return
  const top = scroller.scrollTop + firstRow.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  scroller.scrollTo({ top, behavior: 'instant' })
  scroller.dispatchEvent(new Event('workspace-scroll-reset'))
}, { flush: 'post' })

// Wait for real data before clamping a deep-linked page against the result count.
watch([() => route.query.page, totalPages, () => bank.ready, () => bank.loading, pendingPage], () => {
  if (!bank.ready || bank.loading || pendingPage.value !== null) return
  const canonical = page.value > 1 ? String(page.value) : undefined
  if (route.query.page === canonical) return
  const query = { ...route.query }
  if (canonical) query.page = canonical
  else delete query.page
  router.replace({ path: route.path, query, hash: route.hash })
}, { immediate: true })
watch(mode, value => {
  if (value === 'wrongbook' && !['all', 'fuzzy', 'unknown'].includes(listFilters.mastery)) listFilters.mastery = 'all'
}, { immediate: true })

function setPage(value) {
  const next = Math.min(totalPages.value, Math.max(1, Math.trunc(value) || 1))
  const query = { ...route.query }
  if (next > 1) query.page = String(next)
  else delete query.page
  return navigateList(query, next)
}
function navigateList(query, nextPage = 1) {
  const navigation = ++pageNavigation
  // Commit filter and target page in the same Vue patch, before Router resolves.
  pendingPage.value = nextPage
  return router.replace({ path: route.path, query, hash: route.hash }).finally(() => {
    if (navigation === pageNavigation) pendingPage.value = null
  })
}
function setDifficulty(value) {
  listFilters.difficulty = value
  setPage(1)
}
function setMastery(value) {
  listFilters.mastery = value
  setPage(1)
}
function clearScope() {
  const query = { ...route.query }
  for (const key of ['q', 'cat', 'track', 'page']) delete query[key]
  navigateList(query)
}
function clearAll() {
  listFilters.difficulty = 'all'
  listFilters.mastery = 'all'
  clearScope()
}
</script>

<template>
  <div class="space-y-6" :data-list-mode="mode">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <RouterLink to="/" class="hover:text-brand-500">首页</RouterLink><span>/</span>
          <span class="text-slate-600 dark:text-slate-300">{{ heading.title }}</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{{ heading.title }}</h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{{ heading.subtitle }}</p>
        <div v-if="scopeLabel" class="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span class="text-slate-400">当前筛选</span>
          <span class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
            <span class="max-w-[16rem] truncate">{{ scopeLabel }}</span>
            <button type="button" title="清除当前筛选" aria-label="清除当前筛选" class="w-5 h-5 rounded-md inline-flex items-center justify-center text-brand-600/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" @click="clearScope"><Icon name="close" :size="12" /></button>
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2.5 shrink-0">
        <RouterLink v-if="filtered.length" :to="'/q/' + filtered[0].id" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-600/20 transition-colors">
          <span>顺序刷当前列表 ({{ filtered.length }} 题)</span><Icon name="arrow-right" :size="16" />
        </RouterLink>
      </div>
    </div>

    <div v-if="needLogin" data-login-empty class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 py-16 px-6 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center"><Icon name="user" :size="24" /></div>
      <div class="space-y-1">
        <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ mode === 'favorites' ? '登录后查看收藏夹' : '登录后查看错题本' }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ mode === 'favorites' ? '收藏记录保存在云端，登录 ai.xlingo.fun 账号后即可同步。' : '自评为「有点模糊 / 还不会」的题目会自动进入错题本。' }}</p>
      </div>
      <button type="button" class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors" @click="bank.loginOpen = true">登录并同步</button>
    </div>
    <template v-else>
      <ListFilters :difficulty="listFilters.difficulty" :mastery="listFilters.mastery" :mode="mode" @update:difficulty="setDifficulty" @update:mastery="setMastery" />
      <div data-question-list class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        <div v-if="!filtered.length" data-list-empty class="py-16 px-4 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center"><Icon name="search" :size="24" /></div>
          <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">当前筛选条件下暂无匹配题目</div>
          <p class="text-xs text-slate-400">可尝试切换难度标签、清空搜索词或返回全部题库</p>
          <button type="button" class="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 transition-colors" @click="clearAll">重置全部筛选条件</button>
        </div>
        <QuestionRow v-for="question in shown" :key="question.id" :question="question" />
        <ListPagination v-if="filtered.length" :page="page" :total-pages="totalPages" :total="filtered.length" @change="setPage" />
      </div>
    </template>
  </div>
</template>
