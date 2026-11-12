<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useBankStore } from '../stores/bank'
import Icon from './Icon.vue'
const store = useBankStore()
const dialog = ref(null)
const cancelButton = ref(null)
let previousFocus
function resolve(ok) { store.resolveConfirm(ok) }
function focusInside(event) {
  if (store.confirm && dialog.value && !dialog.value.contains(event.target)) cancelButton.value?.focus()
}
function handleKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); resolve(false); return }
  if (event.key !== 'Tab') return
  const elements = [...dialog.value.querySelectorAll('button:not(:disabled)')]
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
watch(() => store.confirm, async (value, oldValue) => {
  if (value) {
    if (!oldValue) previousFocus = document.activeElement
    await nextTick()
    cancelButton.value?.focus()
    document.addEventListener('focusin', focusInside)
  } else {
    document.removeEventListener('focusin', focusInside)
    await nextTick()
    if (previousFocus?.isConnected) previousFocus.focus()
  }
}, { immediate: true })
onBeforeUnmount(() => document.removeEventListener('focusin', focusInside))
</script>

<template>
  <Teleport to="body">
    <div id="confirm-modal" v-if="store.confirm" class="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style="z-index: 110" @click.self="resolve(false)" @keydown.stop="handleKeydown">
      <section ref="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" class="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
        <div class="p-5 flex items-start gap-3.5"><div id="confirm-icon-wrap" class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" :class="store.confirm.tone === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-brand-500/10 text-brand-500'"><Icon :name="store.confirm.tone === 'danger' ? 'logout' : 'alert'" /></div><div class="min-w-0 pt-0.5"><h2 id="confirm-title" class="text-base font-bold text-slate-900 dark:text-white">{{ store.confirm.title || '请确认' }}</h2><p id="confirm-message" class="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ store.confirm.message || '确定继续？' }}</p></div></div>
        <div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5"><button id="confirm-cancel" ref="cancelButton" type="button" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition" @click="resolve(false)">{{ store.confirm.cancelText || '取消' }}</button><button id="confirm-ok" type="button" class="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition" :class="store.confirm.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/20'" @click="resolve(true)">{{ store.confirm.okText || '确定' }}</button></div>
      </section>
    </div>
  </Teleport>
</template>
