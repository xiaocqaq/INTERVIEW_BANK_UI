<script setup>
import { computed, ref, watch } from 'vue'
import { useBankStore } from '../stores/bank'
import Icon from './Icon.vue'
import { copyCodeText, htmlToCodeText, splitAnswerHtml } from '../utils/answer'

const props = defineProps({
  questionId: { type: [String, Number], required: true },
  answerHtml: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['retry'])
const store = useBankStore()
const answerExpanded = ref(false)
const codeExpanded = ref(false)
const parts = computed(() => splitAnswerHtml(props.answerHtml))
const codeText = computed(() => htmlToCodeText(parts.value.code))
const codeLines = computed(() => codeText.value.trimEnd().split('\n').length)

watch(() => props.questionId, () => {
  answerExpanded.value = Boolean(store.alwaysExpandAnswer)
  codeExpanded.value = false
}, { immediate: true, flush: 'sync' })
watch(() => store.alwaysExpandAnswer, value => { answerExpanded.value = Boolean(value) })

function expandAnswer() {
  if (answerExpanded.value) return false
  answerExpanded.value = true
  return true
}
async function copyCode() {
  try {
    await copyCodeText(codeText.value)
    store.notify('代码已复制到剪贴板', 'success')
  } catch (error) {
    store.notify(error.message || '复制失败，请手动选择复制', 'error')
  }
}
defineExpose({ expandAnswer })
</script>

<template>
  <section id="answer-panel" class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden" aria-label="参考答案与深度解析">
    <div class="px-4 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Icon name="bulb" :size="16" class="text-brand-500" />
        <span class="text-sm font-bold text-slate-800 dark:text-slate-100">参考答案与深度解析</span>
      </div>
      <label class="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
        <input v-model="store.alwaysExpandAnswer" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>背题模式（默认展开答案）</span>
      </label>
    </div>
    <div v-if="!answerExpanded" class="p-8 sm:p-12 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center"><Icon name="eye" :size="24" /></div>
      <div class="space-y-1">
        <div class="text-base font-bold text-slate-900 dark:text-white">先自己想一想，再看答案详解</div>
        <p class="text-xs text-slate-500 dark:text-slate-400">主动回忆核心原理与关键词，让知识记得更牢</p>
      </div>
      <div class="pt-2">
        <button type="button" :aria-expanded="answerExpanded" aria-controls="answer-content" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-600/20 transition" @click="expandAnswer">
          <span>查看答案</span><kbd class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-700 text-brand-100">Space</kbd>
        </button>
      </div>
    </div>
    <div v-else-if="loading" class="p-8 text-center text-sm text-slate-500" role="status">正在加载答案…</div>
    <div v-else-if="error" class="p-8 text-center space-y-3" role="alert">
      <p class="text-sm text-rose-600 dark:text-rose-400">{{ error }}</p>
      <button type="button" class="text-sm text-brand-600 hover:underline" @click="emit('retry')">重新加载</button>
    </div>
    <div v-else id="answer-content" class="p-4 sm:p-8 space-y-6 animate-fade-in">
      <div class="rounded-2xl bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 p-5 space-y-2">
        <h2 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300"><span class="w-2 h-2 rounded-full bg-brand-500"></span>核心答案（面试直答精炼版）</h2>
        <div v-if="parts.core" class="answer-prose text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed" v-html="parts.core"></div>
        <p v-else class="text-sm text-slate-400">暂无答案</p>
      </div>
      <div v-if="parts.analysis" class="space-y-2.5">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><span class="w-1.5 h-4 rounded-full bg-indigo-500"></span>深入解析</h2>
        <div class="answer-prose text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-7 pl-3.5 border-l-2 border-slate-100 dark:border-slate-800" v-html="parts.analysis"></div>
      </div>
      <div v-if="parts.followups" class="space-y-2.5">
        <h2 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><span class="w-1.5 h-4 rounded-full bg-amber-500"></span>常见追问</h2>
        <div class="answer-prose text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-7 pl-3.5 border-l-2 border-slate-100 dark:border-slate-800" v-html="parts.followups"></div>
      </div>
      <div v-if="parts.code" class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div class="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <button type="button" :aria-expanded="codeExpanded" aria-controls="answer-code" class="flex items-center gap-2 text-xs font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-brand-600 transition" @click="codeExpanded = !codeExpanded">
            <Icon name="code" :size="16" /><span>代码示例<span v-if="codeText.trim()"> · {{ codeLines }} 行</span> · {{ codeExpanded ? '收起' : '展开' }}</span>
          </button>
          <button v-if="codeText.trim()" type="button" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-brand-600 border border-slate-200 dark:border-slate-700 transition" @click="copyCode"><Icon name="copy" :size="14" /><span>复制代码</span></button>
        </div>
        <div v-show="codeExpanded" id="answer-code" class="answer-prose avoid-dark-invert min-w-0" v-html="parts.code"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.answer-prose { min-width: 0; overflow-wrap: anywhere; }
.answer-prose :deep(.answer-table-wrap) { width: 100%; max-width: 100%; overflow-x: auto; margin: 1rem 0; overscroll-behavior-x: contain; }
.answer-prose :deep(.answer-table-wrap table) { width: max-content; min-width: 100%; max-width: none; margin: 0; }
.answer-prose :deep(pre) { max-width: 100%; overflow-x: auto; white-space: pre; }
</style>
