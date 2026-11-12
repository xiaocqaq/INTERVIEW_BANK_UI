<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useBankStore } from '../stores/bank'

const props = defineProps({ question: { type: Object, required: true } })
const emit = defineEmits(['rated'])
const store = useBankStore()
const busy = ref(false)
let generation = 0
const options = [
  { status: 'mastered', label: '掌握了', key: '1', selected: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20', normal: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20' },
  { status: 'fuzzy', label: '有点模糊', key: '2', selected: 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm shadow-amber-500/20', normal: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 hover:bg-amber-500/20' },
  { status: 'unknown', label: '还不会', key: '3', selected: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20', normal: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 hover:bg-rose-500/20' },
]
watch(() => props.question.id, () => { generation += 1; busy.value = false }, { flush: 'sync' })
onBeforeUnmount(() => { generation += 1 })
function openLogin() { store.loginOpen = true }
async function rate(status) {
  if (!options.some(option => option.status === status) || busy.value) return
  if (!store.user) {
    store.notify('请先登录，自评结果才能保存')
    openLogin()
    return
  }
  const id = props.question.id
  const request = ++generation
  busy.value = true
  try {
    const success = await store.rateQuestion(id, status)
    if (success && request === generation && String(props.question.id) === String(id)) emit('rated', { id, status })
  } catch (error) {
    if (request === generation) store.notify('记录失败：' + (error.message || '请稍后重试'), 'error')
  } finally {
    if (request === generation) busy.value = false
  }
}
defineExpose({ rate })
</script>

<template>
  <section id="mastery-rating" class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4" :aria-busy="busy" aria-label="题目掌握自评">
    <div class="space-y-1">
      <h2 class="text-sm font-bold text-slate-900 dark:text-white">这题你掌握得怎么样？</h2>
      <label v-if="store.user" class="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
        <input v-model="store.autoNextOnRate" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
        <span>点选后自动进入下一题</span>
      </label>
      <div v-else class="text-xs text-slate-500 dark:text-slate-400"><button type="button" class="font-semibold text-brand-600 dark:text-brand-400 hover:underline" @click="openLogin">登录</button> 后自评结果才会保存到云端</div>
    </div>
    <div class="grid grid-cols-3 gap-2.5 sm:flex sm:items-center">
      <button v-for="option in options" :key="option.status" type="button" :data-rate-status="option.status" :aria-pressed="question.lastStatus === option.status" :aria-keyshortcuts="option.key" :disabled="busy" :class="question.lastStatus === option.status ? option.selected : option.normal" class="px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait" @click="rate(option.status)">
        <span class="w-2 h-2 rounded-full bg-current"></span><span>{{ option.label }}</span>
      </button>
    </div>
  </section>
</template>
