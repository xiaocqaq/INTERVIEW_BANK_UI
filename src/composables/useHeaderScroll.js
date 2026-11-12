import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// The app scrolls its workspace, rather than the browser document.
export function useHeaderScroll(route, blocked) {
  const hidden = ref(false)
  let scroller
  let previousY = 0
  let upwardDistance = 0
  let lockedUntil = 0
  let frame = 0
  let touchY = 0
  let keepHiddenAtTop = false
  const listeners = []

  function reveal() {
    keepHiddenAtTop = false
    hidden.value = false
    upwardDistance = 0
    previousY = scroller?.scrollTop || 0
    lockedUntil = 0
  }
  function applyScroll() {
    frame = 0
    const y = scroller.scrollTop
    const delta = y - previousY
    previousY = y
    if (blocked() || document.activeElement?.closest('#app-header')) { reveal(); return }
    // Question navigation resets scrollTop; that reset must not reopen the header.
    if (y <= 8) { if (!keepHiddenAtTop) reveal(); return }
    if (performance.now() < lockedUntil) return
    upwardDistance = delta < 0 ? upwardDistance - delta : 0
    if (hidden.value && upwardDistance >= 12) {
      hidden.value = false
      lockedUntil = performance.now() + 300
    } else if (!hidden.value && delta > 4 && y > 96) {
      hidden.value = true
      lockedUntil = performance.now() + 300
    }
  }
  function listen(name, handler) {
    scroller.addEventListener(name, handler, { passive: true })
    listeners.push([name, handler])
  }
  watch(hidden, value => document.body.classList.toggle('header-collapsed', value))
  watch(() => route.fullPath, (path, previousPath) => {
    // Pagination and filters patch the current view; preserve its header height.
    if (route.path === previousPath?.split(/[?#]/)[0]) return
    const isQuestion = value => /^\/q\/\d+(?:[?#]|$)/.test(value || '')
    if (isQuestion(path) && isQuestion(previousPath) && !blocked()) {
      keepHiddenAtTop = true
      hidden.value = true
      upwardDistance = 0
      previousY = 0
      lockedUntil = 0
    } else reveal()
  })
  watch(blocked, value => { if (value) reveal() })
  onMounted(() => {
    scroller = document.getElementById('main-scroll-container')
    if (!scroller) return
    previousY = scroller.scrollTop
    listen('workspace-scroll-reset', () => {
      // A new list page starts at its first row, without simulating an upward gesture.
      keepHiddenAtTop = hidden.value
      previousY = scroller.scrollTop
      upwardDistance = 0
      // Keep any active header-transition lock while the viewport settles.
    })
    listen('scroll', () => { if (!frame) frame = requestAnimationFrame(applyScroll) })
    listen('wheel', event => { if (event.deltaY < -6 && (scroller.scrollTop <= 8 || keepHiddenAtTop)) reveal() })
    listen('touchstart', event => { touchY = event.touches[0]?.clientY || 0 })
    listen('touchmove', event => {
      const y = event.touches[0]?.clientY || touchY
      if ((scroller.scrollTop <= 8 || keepHiddenAtTop) && y - touchY > 24) { reveal(); touchY = y }
    })
  })
  onBeforeUnmount(() => {
    listeners.forEach(([name, handler]) => scroller?.removeEventListener(name, handler))
    if (frame) cancelAnimationFrame(frame)
    document.body.classList.remove('header-collapsed')
  })
  return { hidden, reveal }
}
