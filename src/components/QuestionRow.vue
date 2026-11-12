<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import FavoriteButton from './FavoriteButton.vue'
import StatusDot from './StatusDot.vue'

const props = defineProps({ question: { type: Object, required: true } })
const router = useRouter()
const difficultyClass = computed(() => ({
  简单: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  中等: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
}[props.question.difficulty] || 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'))
const target = computed(() => '/q/' + props.question.id)
function openQuestion(event) {
  if (event.target.closest('a, button')) return
  router.push(target.value)
}
</script>

<template>
  <div
    data-row-anim
    :data-question-id="question.id"
    class="group px-4 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
    @click="openQuestion"
  >
    <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
      <div class="pt-1 sm:pt-0 shrink-0"><StatusDot :status="question.lastStatus" /></div>
      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono text-xs text-slate-400">#{{ question.id }}</span>
          <span class="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{{ question.categoryName }}</span>
          <h3 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            <RouterLink :to="target">{{ question.title }}</RouterLink>
          </h3>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span v-for="(tag, index) in question.tags" :key="index" class="text-[11px] px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-mono">{{ tag }}</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2.5 shrink-0" @click.stop>
      <span class="text-xs font-medium px-2.5 py-1 rounded-full border" :class="difficultyClass">{{ question.difficulty }}</span>
      <FavoriteButton :question="question" data-fav-style="icon" />
    </div>
  </div>
</template>
