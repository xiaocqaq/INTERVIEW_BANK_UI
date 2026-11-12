<script setup>
import { computed, ref } from 'vue'
import { useBankStore } from '../stores/bank'
import Icon from './Icon.vue'
const props = defineProps({ question: { type: Object, required: true }, variant: { type: String, default: 'icon', validator: value => ['icon', 'pill'].includes(value) } })
const store = useBankStore()
const busy = ref(false)
const favorite = computed(() => (store.findQuestion(props.question.id) || props.question).favorite)
async function toggle() {
  if (busy.value) return
  busy.value = true
  try { await store.toggleFavorite(props.question.id) } finally { busy.value = false }
}
</script>

<template>
  <button type="button" :data-fav-id="question.id" :data-favorite="favorite ? '1' : '0'" :aria-pressed="Boolean(favorite)" :aria-label="favorite ? '取消收藏' : '收藏题目'" :title="favorite ? '取消收藏' : '收藏题目'" :disabled="busy" class="inline-flex shrink-0 items-center justify-center transition disabled:opacity-60" :class="[variant === 'pill' ? 'w-10 h-10 rounded-xl border' : 'p-2 rounded-lg', favorite ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border-slate-200 dark:border-slate-700']" @click.stop="toggle">
    <Icon name="star" :size="18" :class="{ 'fill-current': favorite }" />
  </button>
</template>
