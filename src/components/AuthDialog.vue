<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useBankStore } from '../stores/bank'
import Icon from './Icon.vue'
const store = useBankStore()
const dialog = ref(null)
const usernameInput = ref(null)
const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
let previousFocus

function close() { store.loginOpen = false }
function focusInside(event) {
  if (store.loginOpen && !store.confirm && dialog.value && !dialog.value.contains(event.target)) usernameInput.value?.focus()
}
function handleKeydown(event) {
  if (store.confirm) return
  if (event.key === 'Escape') { event.preventDefault(); close() }
  if (event.key !== 'Tab') return
  const elements = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')].filter(el => el.getClientRects().length)
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
async function submit() {
  if (busy.value) return
  error.value = ''
  if (!username.value.trim() || !password.value) { error.value = '请输入账号与密码'; return }
  busy.value = true
  try {
    const result = await store.login(username.value.trim(), password.value)
    if (result === false) error.value = typeof store.error === 'string' ? store.error : '登录失败，请检查账号和密码'
    else close()
  } catch (err) {
    if (store.loginOpen) error.value = err?.status === 401 ? '账号或密码错误' : err?.message || '登录失败，请稍后重试'
  } finally { busy.value = false }
}
watch(() => store.loginOpen, async open => {
  if (open) {
    previousFocus = document.activeElement
    error.value = ''
    password.value = ''
    await nextTick()
    usernameInput.value?.focus()
    document.addEventListener('focusin', focusInside)
  } else {
    password.value = ''
    error.value = ''
    document.removeEventListener('focusin', focusInside)
    await nextTick()
    if (!store.confirm && previousFocus?.isConnected) previousFocus.focus()
  }
}, { immediate: true })
onBeforeUnmount(() => document.removeEventListener('focusin', focusInside))
</script>

<template>
  <Teleport to="body">
    <div id="login-modal" v-if="store.loginOpen" class="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style="z-index: 100" @click.self="close" @keydown.stop="handleKeydown">
      <section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" aria-describedby="login-description" class="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in">
        <div class="px-6 pt-6 pb-4 flex items-start justify-between border-b border-slate-100 dark:border-slate-800"><div><h2 id="login-title" class="text-lg font-bold text-slate-900 dark:text-white">登录面试刷题库</h2><p id="login-description" class="mt-1 text-xs text-slate-500 dark:text-slate-400">使用统一账号，云端同步收藏和学习进度。</p></div><button id="btn-close-login" type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="关闭登录窗口" @click="close"><Icon name="close" /></button></div>
        <form id="login-form" class="p-6 space-y-4" :aria-busy="busy" @submit.prevent="submit">
          <div id="login-error" v-show="error" role="alert" class="px-3 py-2 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">{{ error }}</div>
          <div><label for="login-username" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">用户名 / 邮箱</label><input id="login-username" ref="usernameInput" v-model="username" type="text" name="username" autocomplete="username" required placeholder="请输入账号 / 邮箱" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'login-error' : undefined" class="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /></div>
          <div><label for="login-password" class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">密码</label><input id="login-password" v-model="password" type="password" name="password" autocomplete="current-password" required placeholder="请输入登录密码" :aria-invalid="Boolean(error)" :aria-describedby="error ? 'login-error' : undefined" class="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /></div>
          <div class="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1"><span class="inline-flex items-center gap-2"><Icon name="check" :size="14" class="text-brand-600" />保持登录，自动云同步</span><a id="btn-register-link" href="https://ai.mxiao.top/login" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0">注册账号<Icon name="arrow-right" :size="12" /></a></div>
          <div class="pt-3 flex items-center justify-end gap-2.5"><button type="button" class="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition" @click="close">取消</button><button id="btn-login-submit" type="submit" :disabled="busy" class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-sm shadow-brand-600/20 transition disabled:opacity-60 disabled:cursor-wait">{{ busy ? '登录中…' : '登录并同步' }}</button></div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
