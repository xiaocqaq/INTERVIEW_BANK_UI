import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  // FastAPI serves production assets under /static/.
  base: process.env.NODE_ENV === 'production' ? '/static/' : '/',
  server: { proxy: { '/api': 'http://127.0.0.1:8650' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8650' } },
  build: { assetsDir: 'assets', manifest: true },
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.js'] },
})
