<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useBankStore } from '../stores/bank'
import AnswerPanel from '../components/AnswerPanel.vue'
import MasteryRating from '../components/MasteryRating.vue'
import FavoriteButton from '../components/FavoriteButton.vue'

const store = useBankStore()
const route = useRoute()
const router = useRouter()
const answerPanel = ref(null)
const masteryRating = ref(null)
const detail = ref(null)
const loading = ref(false)
const error = ref('')
let loadVersion = 0
const questionId = computed(() => {
  const value = String(route.params.id || '')
  const id = Number(value)
  return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 ? id : null
})
const question = computed(() => questionId.value ? store.findQuestion(questionId.value) : null)
const siblings = computed(() => question.value ? store.getSiblings(question.value) : { index: 0, total: 0, prev: null, next: null })
const nextSection = computed(() => question.value && !siblings.value.next ? store.getNextSection(question.value) : null)
const progress = computed(() => siblings.value.total ? Math.min(100, Math.round(siblings.value.index / siblings.value.total * 100)) : 0)
const difficultyClass = computed(() => question.value?.difficulty === '简单'
  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  : question.value?.difficulty === '中等'
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20')

async function loadQuestion() {
  const version = ++loadVersion
  const id = questionId.value
  detail.value = null
  error.value = ''
  loading.value = Boolean(id)
  if (!id) { store.currentQuestionId = null; return }
  try {
    if (!store.ready) await store.boot()
    if (version !== loadVersion || questionId.value !== id) return
    store.currentQuestionId = id
    const response = await store.loadDetail(id)
    if (version !== loadVersion || questionId.value !== id) return
    if (!response) throw new Error('答案加载失败，请稍后重试')
    store.rememberQuestion(id)
    detail.value = response
  } catch (cause) {
    if (version === loadVersion) error.value = cause.message || '答案加载失败，请稍后重试'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

watch(() => route.params.id, () => {
  loadQuestion()
  const id = questionId.value
  nextTick(() => {
    if (id === questionId.value) {
      const scroller = document.getElementById('main-scroll-container')
      if (scroller) scroller.scrollTop = 0
    }
  })
}, { immediate: true, flush: 'sync' })

function goQuestion(id) { if (id) router.push('/q/' + id) }
function goNext() {
  if (siblings.value.next) goQuestion(siblings.value.next.id)
  else if (nextSection.value) goQuestion(nextSection.value.firstId)
  else router.push('/list')
}
function onRated({ id }) {
  // The user may have navigated while the record request was in flight.
  if (String(questionId.value) !== String(id) || !store.autoNextOnRate) return
  if (siblings.value.next) goQuestion(siblings.value.next.id)
}
function modalIsOpen() {
  if (store.loginOpen || store.confirm) return true
  return Array.from(document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"], [data-modal-open="true"]'))
    .some(element => element.getClientRects().length > 0)
}
function isEditing(element) {
  return element instanceof HTMLElement && (element.isContentEditable || Boolean(element.closest('input, textarea, select, [role="textbox"]')))
}
function onKeydown(event) {
  if (!question.value || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || modalIsOpen()) return
  if (event.composedPath().some(isEditing) || isEditing(document.activeElement)) return
  if (event.code === 'Space' || event.key === ' ') {
    // Let focused controls keep native Space activation.
    if (event.target instanceof Element && event.target.closest('button, a, summary, [role="button"]')) return
    if (answerPanel.value?.expandAnswer()) event.preventDefault()
  } else {
    const status = { '1': 'mastered', '2': 'fuzzy', '3': 'unknown' }[event.key]
    if (status && masteryRating.value) {
      event.preventDefault()
      masteryRating.value.rate(status)
    }
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  loadVersion += 1
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="question" :data-detail-id="question.id" class="max-w-4xl mx-auto space-y-4 pb-1">
    <div id="detail-navbar" class="sticky top-0 z-20 bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 sm:px-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2 sm:gap-4">
      <nav aria-label="面包屑" class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
        <RouterLink to="/" class="text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium shrink-0">首页</RouterLink>
        <span class="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
        <RouterLink :to="{ path: '/list', query: { track: question.track } }" class="text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium shrink-0">{{ question.trackName }}</RouterLink>
        <span class="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
        <RouterLink :to="{ path: '/list', query: { track: question.track, cat: question.categoryId } }" class="max-w-[9rem] text-slate-600 dark:text-slate-300 hover:text-brand-600 font-medium truncate">{{ question.categoryName }}</RouterLink>
        <span class="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
        <span class="font-mono font-semibold text-brand-600 dark:text-brand-400 shrink-0" aria-current="page">#{{ question.id }}</span>
      </nav>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <span class="text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">本章节 {{ siblings.index }}/{{ siblings.total }} 题</span>
          <div class="w-12 sm:w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" role="progressbar" :aria-valuenow="siblings.index" :aria-valuemax="siblings.total" :aria-valuemin="0" aria-label="小节进度"><div :style="{ width: progress + '%' }" class="h-full bg-brand-500 rounded-full"></div></div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" :disabled="!siblings.prev" class="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-300 dark:disabled:text-slate-700 disabled:cursor-not-allowed transition" @click="goQuestion(siblings.prev?.id)">← 上一题</button>
          <button v-if="nextSection" type="button" :title="'下一小节：' + nextSection.name + '（' + nextSection.trackName + '）'" class="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-brand-500/40 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition inline-flex items-center gap-1" @click="goNext"><span>下一小节</span><span class="hidden sm:inline-block max-w-[6.5rem] truncate align-bottom text-[11px] opacity-70">· {{ nextSection.name }}</span><span>→</span></button>
          <button v-else type="button" class="px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" @click="goNext">{{ siblings.next ? '下一题 →' : '返回题库' }}</button>
        </div>
      </div>
    </div>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 sm:space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <span :class="difficultyClass" class="text-xs font-semibold px-2.5 py-1 rounded-full border">{{ question.difficulty }}</span>
          <span class="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{{ question.categoryName }}</span>
          <span v-for="tag in question.tags" :key="tag" class="text-xs font-mono px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">#{{ tag }}</span>
        </div>
        <FavoriteButton :question="question" variant="pill" />
      </div>
      <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">{{ question.title }}</h1>
    </div>
    <AnswerPanel ref="answerPanel" :question-id="question.id" :answer-html="detail?.answer_html || ''" :loading="loading" :error="error" @retry="loadQuestion" />
    <MasteryRating ref="masteryRating" :question="question" @rated="onRated" />
  </div>
  <div v-else-if="loading" class="py-20 text-center text-sm text-slate-500" role="status">正在加载题目…</div>
  <div v-else-if="error || store.error" class="py-20 text-center space-y-3" role="alert"><p class="text-sm text-rose-600">{{ error || store.error }}</p><button type="button" class="text-sm text-brand-600 hover:underline" @click="loadQuestion">重新加载</button></div>
  <div v-else class="py-20 text-center text-sm text-slate-500">题目不存在或已下线 <RouterLink to="/list" class="text-brand-600 hover:underline">返回题库</RouterLink></div>
</template>
