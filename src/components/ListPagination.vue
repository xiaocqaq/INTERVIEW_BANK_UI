<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, required: true },
})
defineEmits(['change'])
const numbers = computed(() => {
  const visible = [...new Set([1, props.totalPages, props.page - 1, props.page, props.page + 1])]
    .filter(n => n >= 1 && n <= props.totalPages).sort((a, b) => a - b)
  const result = []
  for (const n of visible) {
    if (result.length && n - result[result.length - 1] > 1) result.push('…')
    result.push(n)
  }
  return result
})
const edgeClass = disabled => disabled
  ? 'border-slate-200/70 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
</script>

<template>
  <nav aria-label="题目分页" data-list-pagination class="px-3 sm:px-4 py-3.5 flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
    <button type="button" :disabled="page <= 1" :class="edgeClass(page <= 1)" class="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors" @click="$emit('change', page - 1)">上一页</button>
    <template v-for="(number, index) in numbers" :key="typeof number === 'number' ? number : 'gap-' + index">
      <span v-if="number === '…'" class="px-1 text-xs text-slate-400 select-none" aria-hidden="true">…</span>
      <button
        v-else type="button" :aria-current="number === page ? 'page' : undefined" :aria-label="'第 ' + number + ' 页'"
        class="min-w-8 px-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors"
        :class="number === page ? 'bg-brand-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
        @click="$emit('change', number)"
      >{{ number }}</button>
    </template>
    <button type="button" :disabled="page >= totalPages" :class="edgeClass(page >= totalPages)" class="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors" @click="$emit('change', page + 1)">下一页</button>
    <span class="w-full sm:w-auto text-center text-[11px] font-mono text-slate-400 sm:ml-2" aria-live="polite">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 题</span>
  </nav>
</template>
