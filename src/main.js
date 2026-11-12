import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './styles/main.css'
import './pygments.css'
import './clay.css'

createApp(App).use(createPinia()).use(router).mount('#app')
