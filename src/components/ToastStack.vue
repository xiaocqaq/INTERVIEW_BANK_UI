<script setup>
import { useBankStore } from '../stores/bank'
import Icon from './Icon.vue'
const store = useBankStore()
function dismiss(id) { const index = store.toasts.findIndex(toast => toast.id === id); if (index >= 0) store.toasts.splice(index, 1) }
function appearance(type) {
  if (type === 'success') return 'border-emerald-500/30 bg-emerald-950/95 text-emerald-100'
  if (type === 'warning') return 'border-amber-500/30 bg-slate-900/95 text-amber-100'
  if (type === 'error') return 'border-rose-500/40 bg-slate-900/95 text-rose-100'
  return 'border-slate-700 bg-slate-900/95 text-white'
}
</script>

<template>
  <Teleport to="body">
    <div id="toast-container" class="fixed bottom-5 right-4 sm:right-5 left-4 sm:left-auto max-w-sm ml-auto pointer-events-none flex flex-col gap-2" style="z-index: 120" aria-label="操作通知">
      <TransitionGroup name="toast">
        <div v-for="toast in store.toasts" :key="toast.id" class="px-4 py-2.5 rounded-xl border text-xs font-medium shadow-lg flex items-center gap-2 pointer-events-auto" :class="appearance(toast.type)" :role="toast.type === 'error' ? 'alert' : 'status'" aria-atomic="true" :data-toast-id="toast.id">
          <Icon :name="toast.type === 'success' ? 'check' : ['error', 'warning'].includes(toast.type) ? 'alert' : 'bulb'" :size="15" class="shrink-0" /><span class="flex-1 min-w-0 break-words">{{ toast.message }}</span><button type="button" class="p-1 rounded hover:bg-white/10 shrink-0" aria-label="关闭通知" @click="dismiss(toast.id)"><Icon name="close" :size="13" /></button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
@media (prefers-reduced-motion: reduce) { .toast-enter-active, .toast-leave-active { transition: none; } }
</style>
