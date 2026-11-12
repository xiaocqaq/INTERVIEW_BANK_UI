<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  difficulty: { type: String, default: 'all' },
  mastery: { type: String, default: 'all' },
  mode: { type: String, default: 'all' },
})
defineEmits(['update:difficulty', 'update:mastery'])
const difficulties = ['all', '简单', '中等', '困难']
const masteries = computed(() => [
  { id: 'all', label: '全部状态', dot: '' },
  { id: 'mastered', label: '掌握了', dot: 'bg-emerald-500' },
  { id: 'fuzzy', label: '有点模糊', dot: 'bg-amber-500' },
  { id: 'unknown', label: '还不会', dot: 'bg-rose-500' },
  { id: 'unrated', label: '未自评', dot: 'bg-slate-400' },
].filter(item => props.mode !== 'wrongbook' || ['all', 'fuzzy', 'unknown'].includes(item.id)))
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5" data-list-filters>
    <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="难度筛选">
      <span class="text-xs font-medium text-slate-400 mr-1">难度:</span>
      <button
        v-for="diff in difficulties" :key="diff" type="button"
        data-filter="difficulty" :data-value="diff" :aria-pressed="difficulty === diff"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        :class="difficulty === diff ? 'bg-brand-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'"
        @click="$emit('update:difficulty', diff)"
      >{{ diff === 'all' ? '全部难度' : diff }}</button>
      <button
        type="button" class="ml-0.5 w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
        :class="{ 'invisible pointer-events-none': difficulty === 'all' }"
        :disabled="difficulty === 'all'" title="清除难度筛选" aria-label="清除难度筛选"
        @click="$emit('update:difficulty', 'all')"
      ><Icon name="close" :size="14" /></button>
    </div>
    <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="掌握度筛选">
      <span class="text-xs font-medium text-slate-400 mr-1">掌握度:</span>
      <button
        v-for="item in masteries" :key="item.id" type="button"
        data-filter="mastery" :data-value="item.id" :aria-pressed="mastery === item.id"
        class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
        :class="mastery === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'"
        @click="$emit('update:mastery', item.id)"
      >
        <span v-if="item.dot" class="w-1.5 h-1.5 rounded-full" :class="item.dot" />
        <span>{{ item.label }}</span>
      </button>
      <button
        type="button" class="ml-0.5 w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
        :class="{ 'invisible pointer-events-none': mastery === 'all' }"
        :disabled="mastery === 'all'" title="清除掌握度筛选" aria-label="清除掌握度筛选"
        @click="$emit('update:mastery', 'all')"
      ><Icon name="close" :size="14" /></button>
    </div>
  </div>
</template>
