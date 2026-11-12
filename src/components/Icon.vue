<script setup>
import { computed } from 'vue'
const props = defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 20 } })
const paths = {
  home: ['M3 12l9-9 9 9', 'M5 10v10h5v-6h4v6h5V10'],
  list: ['M4 6h16M4 10h16M4 14h16M4 18h16'],
  star: ['m12 3 2.78 5.63L21 9.54l-4.5 4.39L17.56 20 12 17.08 6.44 20l1.06-6.07L3 9.54l6.22-.91L12 3Z'],
  alert: ['M12 9v4m0 4h.01', 'm10.3 3.9-8.1 14A2 2 0 0 0 3.9 21h16.2a2 2 0 0 0 1.7-3.1l-8.1-14a2 2 0 0 0-3.4 0Z'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  search: ['m21 21-6-6', 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z'],
  sun: ['M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36-.71-.71M6.34 6.34l-.71-.71m12.73 0-.71.71M6.34 17.66l-.71.71', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  moon: ['M20.35 15.35A9 9 0 0 1 8.65 3.65 9 9 0 1 0 20.35 15.35Z'],
  monitor: ['M9 17 8 21h8l-1-4M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z'],
  user: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0H5Z'],
  close: ['M6 18 18 6M6 6l12 12'],
  'arrow-right': ['M5 12h14m-6-6 6 6-6 6'],
  'arrow-left': ['M19 12H5m6-6-6 6 6 6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 5 7 7-7 7'],
  check: ['m5 12 4 4L19 6'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  code: ['m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18'],
  copy: ['M9 9h12v12H9Z', 'M5 15H3V3h12v2'],
  book: ['M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2V3Z'],
  logout: ['m17 16 4-4-4-4m4 4H7m6 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3'],
  shield: ['m9 12 2 2 4-4', 'M20.62 5.98A11.96 11.96 0 0 1 12 2.94a11.96 11.96 0 0 1-8.62 3.04A12 12 0 0 0 3 9c0 5.59 3.82 10.29 9 11.62C17.18 19.29 21 14.59 21 9c0-1.04-.13-2.05-.38-3.02Z'],
  shuffle: ['M3 7h3l12 10h3m-4-4 4 4-4 4M3 17h3l4-4m4-2 4-4h3m-4-4 4 4-4 4'],
  bulb: ['M9 18h6m-5 3h4M9 15v-1a6 6 0 1 1 6 0v1H9Z'],
  grid: ['M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z'],
}
const selectedPaths = computed(() => paths[props.name] || paths.book)
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="shrink-0">
    <path v-for="(path, index) in selectedPaths" :key="index" :d="path" />
  </svg>
</template>
