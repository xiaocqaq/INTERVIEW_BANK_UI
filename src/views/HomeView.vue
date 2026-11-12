<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank.js'
import Icon from '../components/Icon.vue'

const bank = useBankStore()
const router = useRouter()
const total = computed(() => bank.stats.total || bank.questions.length)
const categoryTotal = computed(() => bank.groups.reduce((sum, group) => sum + group.categories.length, 0))
const trackNames = computed(() => bank.groups.map(group => group.name).join(' · '))
const activeTrack = computed(() => bank.groups.some(group => group.id === bank.homeTrackFilter) ? bank.homeTrackFilter : 'all')
const tabs = computed(() => [
  { id: 'all', label: '全部', count: total.value },
  ...bank.groups.map(group => ({ id: group.id, label: group.name, count: group.totalCount })),
])
const filteredGroups = computed(() => activeTrack.value === 'all'
  ? bank.groups : bank.groups.filter(group => group.id === activeTrack.value))
const masteredByCategory = computed(() => {
  const counts = {}
  if (bank.user) for (const question of bank.questions) {
    if (question.lastStatus === 'mastered') counts[question.categoryId] = (counts[question.categoryId] || 0) + 1
  }
  return counts
})
const heroTarget = computed(() => bank.heroTargetQuestion())
const primaryLabel = computed(() => heroTarget.value?.resume ? '继续学习' : '开始学习')
const percent = n => total.value ? Math.min(100, Math.max(0, n / total.value * 100)) + '%' : '0%'
function startPractice() {
  const target = heroTarget.value
  router.push(target?.q ? '/q/' + target.q.id : '/list')
}
function randomQuestion() {
  const pool = activeTrack.value === 'all' ? bank.questions : bank.questions.filter(question => question.track === activeTrack.value)
  if (!pool.length) return bank.notify('题库暂无题目')
  const question = pool[Math.floor(Math.random() * pool.length)]
  bank.notify('已随机抽取：' + question.categoryName + ' · #' + question.id)
  router.push('/q/' + question.id)
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-10" data-home-view>
    <header class="pt-2">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">面试刷题库</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ trackNames }}，共 {{ categoryTotal }} 个专题、{{ total }} 道题。先自己想，再看解析，最后自评。</p>
      <div class="mt-5 flex flex-wrap items-center gap-2.5">
        <button type="button" data-hero-primary class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 transition-colors" @click="startPractice">
          <span>{{ primaryLabel }}</span><Icon name="arrow-right" :size="16" />
        </button>
        <button type="button" data-random-question class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" @click="randomQuestion">随机一题</button>
        <button v-if="!bank.user" type="button" class="ml-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors" @click="bank.loginOpen = true">登录后可同步进度与错题本 →</button>
      </div>
    </header>

    <section v-if="bank.user" class="space-y-3" aria-label="学习进度">
      <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-slate-500 dark:text-slate-400">
          <span>已掌握 <b class="font-mono font-semibold text-slate-900 dark:text-white">{{ bank.stats.mastered }}</b> / {{ total }}</span>
          <span class="inline-flex items-center gap-1.5"><i class="w-1.5 h-1.5 rounded-full bg-amber-500" />模糊 <b class="font-mono font-medium text-slate-700 dark:text-slate-200">{{ bank.stats.fuzzy }}</b></span>
          <span class="inline-flex items-center gap-1.5"><i class="w-1.5 h-1.5 rounded-full bg-rose-500" />不会 <b class="font-mono font-medium text-slate-700 dark:text-slate-200">{{ bank.stats.unknown }}</b></span>
        </div>
        <RouterLink to="/wrongbook" class="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">错题本 {{ bank.stats.wrongTotal }} 题 →</RouterLink>
      </div>
      <div class="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex" aria-hidden="true">
        <div :style="{ width: percent(bank.stats.mastered) }" class="bg-emerald-500" />
        <div :style="{ width: percent(bank.stats.fuzzy) }" class="bg-amber-400" />
        <div :style="{ width: percent(bank.stats.unknown) }" class="bg-rose-400" />
      </div>
    </section>

    <div class="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
      <nav class="flex gap-5 -mb-px overflow-x-auto" aria-label="技术方向">
        <button
          v-for="tab in tabs" :key="tab.id" type="button" :data-home-track="tab.id" :aria-pressed="activeTrack === tab.id"
          class="pb-2.5 text-sm border-b-2 transition-colors whitespace-nowrap"
          :class="activeTrack === tab.id ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-medium' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
          @click="bank.homeTrackFilter = tab.id"
        >{{ tab.label }}<span class="ml-1.5 font-mono text-xs text-slate-400">{{ tab.count }}</span></button>
      </nav>
    </div>

    <div class="space-y-10">
      <section v-for="group in filteredGroups" :key="group.id" :data-track="group.id">
        <div class="flex items-baseline justify-between mb-1">
          <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <span class="w-1.5 h-1.5 rounded-full" :class="group.dotClass" />{{ group.name }}
            <span class="font-mono text-xs font-normal text-slate-400">{{ group.totalCount }}</span>
          </h2>
        </div>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
          <li v-for="category in group.categories" :key="category.id">
            <RouterLink :to="{ path: '/list', query: { cat: category.id } }" :data-category-id="category.id" class="group w-full text-left flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80" @click="bank.sidebarOpen = false">
              <span class="min-w-0">
                <span class="block text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{{ category.name }}</span>
                <span class="block mt-0.5 text-xs text-slate-400 dark:text-slate-500 truncate">{{ category.desc }}</span>
              </span>
              <span class="shrink-0 font-mono text-xs text-slate-400">
                <template v-if="bank.user"><span :class="{ 'text-emerald-600 dark:text-emerald-400': masteredByCategory[category.id] }">{{ masteredByCategory[category.id] || 0 }}</span>/</template>{{ category.count }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
