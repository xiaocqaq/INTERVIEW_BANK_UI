<script setup>
import { computed } from 'vue'
const props = defineProps({ status: { type: String, default: null } })
const appearance = computed(() => ({
  mastered: { label: '已掌握', mark: '✓', classes: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  fuzzy: { label: '有点模糊', mark: '!', classes: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  unknown: { label: '还不会', mark: '×', classes: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
}[props.status] || { label: '未自评', mark: '○', classes: 'border-slate-300 dark:border-slate-700 text-slate-400' }))
</script>

<template>
  <span class="w-4 h-4 rounded-full border inline-flex items-center justify-center text-[10px] font-bold shrink-0" :class="appearance.classes" role="img" :aria-label="appearance.label" :title="appearance.label" :data-status="status || 'unrated'">{{ appearance.mark }}</span>
</template>
