<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useBankStore } from './stores/bank'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AuthDialog from './components/AuthDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastStack from './components/ToastStack.vue'
const bank = useBankStore()
const route = useRoute()
const main = ref(null)
async function load() { try { await bank.boot(true) } catch { /* Render the retry state below. */ } }
onMounted(load)
watch(() => route.path, async path => {
  bank.sidebarOpen = false
  if (path.startsWith('/q/')) { bank.currentQuestionId = Number(route.params.id); bank.sidebarTab = 'questions' }
  else if (path === '/') bank.sidebarTab = 'categories'
  await nextTick()
  main.value?.scrollTo({ top: 0, behavior: 'instant' })
}, { immediate: true })
</script>

<template>
  <AppHeader />
  <div class="flex flex-1 min-h-0 overflow-hidden relative">
    <AppSidebar />
    <main id="main-scroll-container" ref="main" class="flex-1 min-w-0 overflow-y-auto focus:outline-none" tabindex="-1">
      <div id="view-container" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div v-if="bank.error" role="alert" class="py-24 text-center space-y-4">
          <p class="text-rose-600">{{ bank.error }}</p>
          <button class="rounded-xl bg-brand-600 px-4 py-2 text-white" @click="load">重新加载</button>
        </div>
        <div v-else-if="!bank.ready" role="status" class="py-24 flex flex-col items-center gap-3 text-sm text-slate-500">
          <div class="w-7 h-7 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin"></div>
          正在加载题库…
        </div>
        <!-- Reuse view instances: query/selection changes patch keyed nodes in place. -->
        <RouterView v-else />
      </div>
    </main>
  </div>
  <AuthDialog />
  <ConfirmDialog />
  <ToastStack />
</template>
